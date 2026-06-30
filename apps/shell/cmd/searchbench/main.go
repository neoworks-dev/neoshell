// Command searchbench compares exact vector-search strategies for the neoshell
// index: in-memory brute-force vs a disk-backed (mmap) brute-force. It reports
// build time, resident Go-heap usage, query latency, and recall@k, so we can pick
// the right strategy by dataset size.
//
//	go run ./cmd/searchbench -n 50000 -queries 200 -k 10
package main

import (
	"encoding/binary"
	"flag"
	"fmt"
	"math"
	"math/rand"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"syscall"
	"time"
	"unsafe"
)

const dim = 768

func main() {
	count := flag.Int("n", 50000, "number of vectors in the dataset")
	queries := flag.Int("queries", 200, "number of query vectors")
	k := flag.Int("k", 10, "neighbors per query")
	flag.Parse()

	fmt.Printf("dataset: %d vectors x %d dims (%.0f MB raw), %d queries, k=%d\n\n",
		*count, dim, float64(*count*dim*4)/1e6, *queries, *k)

	rng := rand.New(rand.NewSource(42))
	// Clustered, not uniform: real embeddings have neighborhood structure, so
	// uniform random vectors (all near-orthogonal in high dims) would make recall
	// meaningless. Queries are drawn from the same clusters so they have true NNs.
	clusters := *count / 200
	if clusters < 16 {
		clusters = 16
	}
	centroids := randomVectors(rng, clusters)
	vectors := clusteredVectors(rng, centroids, *count)
	queryVectors := clusteredVectors(rng, centroids, *queries)

	truth := bruteForceAll(vectors, queryVectors, *k)
	path := filepath.Join(os.TempDir(), "searchbench-vectors.f32")
	writeVectors(path, vectors)
	defer os.Remove(path)

	fmt.Printf("%-22s %10s %12s %12s %12s %8s\n", "strategy", "build", "heap", "query p50", "query p99", "recall")
	fmt.Println(repeat('-', 80))

	benchBruteMemory(vectors, queryVectors, *k, truth)

	// Release the in-memory dataset so the disk strategy's heap reflects only the
	// mmap (which lives in the OS page cache / RSS, not the Go heap).
	vectors = nil
	runtime.GC()
	benchDiskMmap(path, *count, queryVectors, *k, truth)
}

// ---------------------------------------------------------------- strategies --

func benchBruteMemory(vectors, queries [][]float32, k int, truth [][]int) {
	start := time.Now()
	// "Build" is just holding the slice; measure the resident heap it costs.
	resident := vectors
	build := time.Since(start)
	heap := heapAfter(func() {})

	p50, p99 := timeQueries(queries, func(q []float32) []int {
		return bruteForce(resident, q, k)
	})
	report("in-memory brute", build, heap, p50, p99, recall(queries, k, truth, func(q []float32) []int {
		return bruteForce(resident, q, k)
	}))
}

func benchDiskMmap(path string, count int, queries [][]float32, k int, truth [][]int) {
	start := time.Now()
	mapped := mmapVectors(path, count)
	build := time.Since(start)
	// Heap stays low: the vectors live in the mmap (OS page cache / RSS), not the
	// Go heap. This is the memory win of disk-backed search.
	heap := heapAfter(func() { _ = mapped[0] })

	search := func(q []float32) []int {
		return bruteForceFlat(mapped, count, q, k)
	}
	p50, p99 := timeQueries(queries, search)
	report("disk mmap brute", build, heap, p50, p99, recall(queries, k, truth, search))
}

// ----------------------------------------------------------------- search ----

func bruteForce(vectors [][]float32, query []float32, k int) []int {
	scored := make([]scoredID, len(vectors))
	for i, v := range vectors {
		scored[i] = scoredID{id: i, score: dot(v, query)}
	}
	return topK(scored, k)
}

// bruteForceFlat scans a flat []float32 (mmap-backed) without materializing
// per-vector slices on the heap.
func bruteForceFlat(flat []float32, count int, query []float32, k int) []int {
	scored := make([]scoredID, count)
	for i := 0; i < count; i++ {
		row := flat[i*dim : (i+1)*dim]
		scored[i] = scoredID{id: i, score: dot(row, query)}
	}
	return topK(scored, k)
}

func bruteForceAll(vectors, queries [][]float32, k int) [][]int {
	truth := make([][]int, len(queries))
	for i, q := range queries {
		truth[i] = bruteForce(vectors, q, k)
	}
	return truth
}

type scoredID struct {
	id    int
	score float32
}

func topK(scored []scoredID, k int) []int {
	sort.Slice(scored, func(i, j int) bool { return scored[i].score > scored[j].score })
	if k > len(scored) {
		k = len(scored)
	}
	ids := make([]int, k)
	for i := 0; i < k; i++ {
		ids[i] = scored[i].id
	}
	return ids
}

// dot is cosine similarity for already-normalized vectors.
func dot(a, b []float32) float32 {
	var sum float32
	for i := range a {
		sum += a[i] * b[i]
	}
	return sum
}

// --------------------------------------------------------------- measuring ---

func timeQueries(queries [][]float32, search func([]float32) []int) (p50, p99 time.Duration) {
	durations := make([]time.Duration, len(queries))
	for i, q := range queries {
		start := time.Now()
		search(q)
		durations[i] = time.Since(start)
	}
	sort.Slice(durations, func(i, j int) bool { return durations[i] < durations[j] })
	return durations[len(durations)*50/100], durations[len(durations)*99/100]
}

func recall(queries [][]float32, k int, truth [][]int, search func([]float32) []int) float64 {
	var hits, total int
	for i, q := range queries {
		got := search(q)
		want := map[int]bool{}
		for _, id := range truth[i] {
			want[id] = true
		}
		for _, id := range got {
			if want[id] {
				hits++
			}
		}
		total += k
	}
	return float64(hits) / float64(total)
}

// heapAfter forces a GC and returns the live heap, after touching keep so the
// structure under test isn't collected before measuring.
func heapAfter(keep func()) uint64 {
	keep()
	runtime.GC()
	var stats runtime.MemStats
	runtime.ReadMemStats(&stats)
	return stats.HeapAlloc
}

func report(name string, build time.Duration, heap uint64, p50, p99 time.Duration, rec float64) {
	fmt.Printf("%-22s %10s %12s %12s %12s %7.1f%%\n",
		name, build.Round(time.Millisecond), fmt.Sprintf("%.0f MB", float64(heap)/1e6),
		p50.Round(time.Microsecond), p99.Round(time.Microsecond), rec*100)
}

// ------------------------------------------------------------------ data -----

func randomVectors(rng *rand.Rand, n int) [][]float32 {
	vectors := make([][]float32, n)
	for i := range vectors {
		vectors[i] = randomUnit(rng)
	}
	return vectors
}

// clusteredVectors draws each vector near a random centroid (centroid + small
// gaussian noise, renormalized), giving the dataset real nearest-neighbor
// structure like actual embeddings.
func clusteredVectors(rng *rand.Rand, centroids [][]float32, n int) [][]float32 {
	vectors := make([][]float32, n)
	for i := range vectors {
		centroid := centroids[rng.Intn(len(centroids))]
		v := make([]float32, dim)
		var norm float64
		for d := range v {
			v[d] = centroid[d] + 0.15*float32(rng.NormFloat64())
			norm += float64(v[d]) * float64(v[d])
		}
		inv := float32(1 / math.Sqrt(norm))
		for d := range v {
			v[d] *= inv
		}
		vectors[i] = v
	}
	return vectors
}

func randomUnit(rng *rand.Rand) []float32 {
	v := make([]float32, dim)
	var norm float64
	for d := range v {
		v[d] = float32(rng.NormFloat64())
		norm += float64(v[d]) * float64(v[d])
	}
	inv := float32(1 / math.Sqrt(norm))
	for d := range v {
		v[d] *= inv
	}
	return v
}

func writeVectors(path string, vectors [][]float32) {
	file, err := os.Create(path)
	if err != nil {
		panic(err)
	}
	defer file.Close()
	buf := make([]byte, dim*4)
	for _, v := range vectors {
		for d, x := range v {
			binary.LittleEndian.PutUint32(buf[d*4:], math.Float32bits(x))
		}
		file.Write(buf)
	}
}

func mmapVectors(path string, count int) []float32 {
	file, err := os.Open(path)
	if err != nil {
		panic(err)
	}
	defer file.Close()
	size := count * dim * 4
	data, err := syscall.Mmap(int(file.Fd()), 0, size, syscall.PROT_READ, syscall.MAP_SHARED)
	if err != nil {
		panic(err)
	}
	return unsafe.Slice((*float32)(unsafe.Pointer(&data[0])), count*dim)
}

func repeat(r rune, n int) string {
	out := make([]rune, n)
	for i := range out {
		out[i] = r
	}
	return string(out)
}
