package searchd

import (
	"context"
	"encoding/gob"
	"math"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
	"unicode"
)

// localStore is the in-process index: a self-contained BM25 inverted index plus
// brute-force cosine vector search, persisted to a single gob file. It replaces
// the external SurrealDB so the daemon has no network dependencies.
//
// Scale: tens of thousands of chunks fit comfortably in memory; BM25 scores only
// candidate postings, and brute-force cosine over a few hundred-k vectors is a
// few milliseconds — well under the query-embedding cost.
const (
	bm25K1 = 1.2
	bm25B  = 0.75
)

type storedChunk struct {
	Ord      int
	Text     string
	Modality string
	Terms    []string // tokenized text, for BM25 (kept for incremental removal)
	Slot     int      // index into the mmap vector file; -1 = no embedding
	// Embedding is only populated when decoding a pre-mmap snapshot; it is
	// migrated into the vector file on load and never written back.
	Embedding []float32
}

type posting struct {
	key string // path + "#" + ord
	tf  int
}

type localStore struct {
	path string
	vec  *vecStore // memory-mapped embeddings (kept off the Go heap)

	mu       sync.RWMutex
	files    map[string]FileRecord
	chunks   map[string][]storedChunk
	postings map[string][]posting // term -> postings
	docLen   map[string]int       // chunk key -> token count
	totalLen int
	dirty    bool

	stop chan struct{}
}

// snapshotVersion 1 stores embeddings in the mmap vector file; version 0 (absent)
// is the legacy format that inlined them in the gob and is migrated on load.
const snapshotVersion = 1

type snapshot struct {
	Version  int
	Files    map[string]FileRecord
	Chunks   map[string][]storedChunk
	VecDim   int
	VecCount int
	VecFree  []int
}

// openLocalStore loads the index from disk (or starts empty) and begins periodic
// persistence.
func openLocalStore(path string) (*localStore, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, err
	}
	vec, err := openVecStore(vectorsPath(path))
	if err != nil {
		return nil, err
	}
	s := &localStore{
		path:     path,
		vec:      vec,
		files:    map[string]FileRecord{},
		chunks:   map[string][]storedChunk{},
		postings: map[string][]posting{},
		docLen:   map[string]int{},
		stop:     make(chan struct{}),
	}
	if err := s.load(); err != nil {
		return nil, err
	}
	s.rebuildIndex()
	go s.periodicSave()
	return s, nil
}

// vectorsPath is the mmap embedding file, beside the gob index.
func vectorsPath(indexPath string) string {
	return filepath.Join(filepath.Dir(indexPath), "vectors.bin")
}

func (s *localStore) load() error {
	file, err := os.Open(s.path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	defer file.Close()

	var snap snapshot
	if err := gob.NewDecoder(file).Decode(&snap); err != nil {
		return nil // corrupt/partial snapshot: start fresh rather than fail
	}
	if snap.Files != nil {
		s.files = snap.Files
	}
	if snap.Chunks != nil {
		s.chunks = snap.Chunks
	}
	s.vec.setMeta(snap.VecDim, snap.VecCount, snap.VecFree)
	s.migrateEmbeddings(snap.Version < snapshotVersion)
	return nil
}

// migrateEmbeddings moves any embeddings inlined by a legacy snapshot into the
// vector file. For legacy chunks without an embedding it marks the slot -1 so
// SearchVector never reads a stale slot 0.
func (s *localStore) migrateEmbeddings(legacy bool) {
	if !legacy {
		return
	}
	for path, chunks := range s.chunks {
		for i := range chunks {
			if len(chunks[i].Embedding) > 0 {
				slot := s.vec.alloc()
				_ = s.vec.write(slot, chunks[i].Embedding)
				chunks[i].Slot = slot
				chunks[i].Embedding = nil
			} else {
				chunks[i].Slot = -1
			}
		}
		s.chunks[path] = chunks
	}
	s.dirty = true // persist in the new format
}

// rebuildIndex reconstructs the BM25 postings from the loaded chunks.
func (s *localStore) rebuildIndex() {
	s.postings = map[string][]posting{}
	s.docLen = map[string]int{}
	s.totalLen = 0
	for path, chunks := range s.chunks {
		for _, chunk := range chunks {
			s.addPostings(chunkKey(path, chunk.Ord), chunk)
		}
	}
}

func chunkKey(path string, ord int) string {
	return path + "#" + itoa(ord)
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var digits []byte
	for n > 0 {
		digits = append([]byte{byte('0' + n%10)}, digits...)
		n /= 10
	}
	return string(digits)
}

func (s *localStore) addPostings(key string, chunk storedChunk) {
	counts := map[string]int{}
	for _, term := range chunk.Terms {
		counts[term]++
	}
	for term, tf := range counts {
		s.postings[term] = append(s.postings[term], posting{key: key, tf: tf})
	}
	s.docLen[key] = len(chunk.Terms)
	s.totalLen += len(chunk.Terms)
}

func (s *localStore) removePostings(path string, chunks []storedChunk) {
	for _, chunk := range chunks {
		key := chunkKey(path, chunk.Ord)
		seen := map[string]bool{}
		for _, term := range chunk.Terms {
			if seen[term] {
				continue
			}
			seen[term] = true
			s.postings[term] = removeKey(s.postings[term], key)
			if len(s.postings[term]) == 0 {
				delete(s.postings, term)
			}
		}
		s.totalLen -= s.docLen[key]
		delete(s.docLen, key)
	}
}

func removeKey(postings []posting, key string) []posting {
	kept := postings[:0]
	for _, p := range postings {
		if p.key != key {
			kept = append(kept, p)
		}
	}
	return kept
}

func (s *localStore) EnsureSchema(context.Context) error { return nil }

func (s *localStore) GetFile(_ context.Context, path string) (FileRecord, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	record, ok := s.files[path]
	return record, ok, nil
}

func (s *localStore) AllPaths(context.Context) ([]string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	paths := make([]string, 0, len(s.files))
	for path := range s.files {
		paths = append(paths, path)
	}
	return paths, nil
}

func (s *localStore) PutFile(_ context.Context, file FileRecord, chunks []ChunkRecord) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if old, ok := s.chunks[file.Path]; ok {
		s.removePostings(file.Path, old)
		s.releaseVectors(old)
	}
	stored := make([]storedChunk, len(chunks))
	for i, chunk := range chunks {
		terms := chunk.Terms
		if terms == nil {
			// No pre-tokenized terms (e.g. the single-file watch path): tokenize here.
			terms = tokenize(chunk.Text)
		}
		slot := -1
		if len(chunk.Embedding) > 0 {
			slot = s.vec.alloc()
			if err := s.vec.write(slot, chunk.Embedding); err != nil {
				return err
			}
		}
		stored[i] = storedChunk{
			Ord:      chunk.Ord,
			Text:     chunk.Text,
			Modality: chunk.Modality,
			Terms:    terms,
			Slot:     slot,
		}
		s.addPostings(chunkKey(file.Path, chunk.Ord), stored[i])
	}
	s.files[file.Path] = file
	s.chunks[file.Path] = stored
	s.dirty = true
	return nil
}

// releaseVectors frees the vector-file slots of chunks being replaced or deleted.
func (s *localStore) releaseVectors(chunks []storedChunk) {
	for _, chunk := range chunks {
		s.vec.release(chunk.Slot)
	}
}

func (s *localStore) DeleteFile(_ context.Context, path string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if old, ok := s.chunks[path]; ok {
		s.removePostings(path, old)
		s.releaseVectors(old)
	}
	delete(s.files, path)
	delete(s.chunks, path)
	s.dirty = true
	return nil
}

func (s *localStore) SearchBM25(_ context.Context, terms []string, limit int) ([]Scored, error) {
	if len(terms) == 0 {
		return nil, nil
	}
	s.mu.RLock()
	defer s.mu.RUnlock()

	numDocs := len(s.docLen)
	if numDocs == 0 {
		return nil, nil
	}
	avgLen := float64(s.totalLen) / float64(numDocs)

	scores := map[string]float64{}
	for _, term := range terms {
		postings := s.postings[term]
		if len(postings) == 0 {
			continue
		}
		idf := math.Log(1 + (float64(numDocs)-float64(len(postings))+0.5)/(float64(len(postings))+0.5))
		for _, p := range postings {
			tf := float64(p.tf)
			norm := tf * (bm25K1 + 1) / (tf + bm25K1*(1-bm25B+bm25B*float64(s.docLen[p.key])/avgLen))
			scores[p.key] += idf * norm
		}
	}
	return s.topScored(scores, limit), nil
}

func (s *localStore) SearchVector(_ context.Context, embedding []float32, limit int) ([]Scored, error) {
	if len(embedding) == 0 {
		return nil, nil
	}
	s.mu.RLock()
	defer s.mu.RUnlock()

	var scored []Scored
	for path, chunks := range s.chunks {
		file := s.files[path]
		for _, chunk := range chunks {
			vector := s.vec.read(chunk.Slot)
			if vector == nil {
				continue
			}
			score := cosine(embedding, vector)
			scored = append(scored, Scored{
				Path: file.Path, Name: file.Name, IsDir: file.IsDir,
				Snippet: snippet(chunk.Text), Modality: chunk.Modality, Score: float64(score),
			})
		}
	}
	return topN(scored, limit), nil
}

// topScored turns BM25 chunk scores into ranked file hits (best chunk per file).
func (s *localStore) topScored(scores map[string]float64, limit int) []Scored {
	var scored []Scored
	for key, score := range scores {
		path, ord := splitKey(key)
		file, ok := s.files[path]
		if !ok {
			continue
		}
		scored = append(scored, Scored{
			Path: file.Path, Name: file.Name, IsDir: file.IsDir,
			Snippet: snippet(s.chunkText(path, ord)), Modality: "text", Score: score,
		})
	}
	return topN(scored, limit)
}

func (s *localStore) chunkText(path string, ord int) string {
	for _, chunk := range s.chunks[path] {
		if chunk.Ord == ord {
			return chunk.Text
		}
	}
	return ""
}

func splitKey(key string) (string, int) {
	idx := strings.LastIndex(key, "#")
	if idx < 0 {
		return key, 0
	}
	ord := 0
	for _, r := range key[idx+1:] {
		ord = ord*10 + int(r-'0')
	}
	return key[:idx], ord
}

func (s *localStore) Close() error {
	close(s.stop)
	err := s.save()
	if vecErr := s.vec.close(); err == nil {
		err = vecErr
	}
	return err
}

func (s *localStore) periodicSave() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-s.stop:
			return
		case <-ticker.C:
			_ = s.save()
		}
	}
}

// save atomically writes the snapshot if dirty.
func (s *localStore) save() error {
	s.mu.Lock()
	if !s.dirty {
		s.mu.Unlock()
		return nil
	}
	dim, count, free := s.vec.meta()
	snap := snapshot{
		Version:  snapshotVersion,
		Files:    s.files,
		Chunks:   s.chunks,
		VecDim:   dim,
		VecCount: count,
		VecFree:  free,
	}
	s.dirty = false
	s.mu.Unlock()

	tmp := s.path + ".tmp"
	file, err := os.Create(tmp)
	if err != nil {
		return err
	}
	if err := gob.NewEncoder(file).Encode(snap); err != nil {
		file.Close()
		return err
	}
	if err := file.Close(); err != nil {
		return err
	}
	return os.Rename(tmp, s.path)
}

// tokenize lowercases and splits text into alphanumeric terms for the BM25 index.
func tokenize(text string) []string {
	return strings.FieldsFunc(strings.ToLower(text), func(r rune) bool {
		return !unicode.IsLetter(r) && !unicode.IsDigit(r)
	})
}
