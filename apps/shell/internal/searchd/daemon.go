package searchd

import (
	"context"
	"io/fs"
	"log"
	"os"
	"runtime"
	"strconv"
	"sync"
)

// Daemon ties the store, embedder, and indexer together: it reconciles the index
// against disk, serves queries over the control socket, and (Phase 3) watches for
// changes.
type Daemon struct {
	store    Store
	embedder Embedder
	indexer  *Indexer
	roots    []string
	progress *progress
}

func NewDaemon(store Store, embedder Embedder, roots []string) *Daemon {
	return &Daemon{
		store:    store,
		embedder: embedder,
		indexer:  NewIndexer(store, embedder),
		roots:    roots,
		progress: newProgress(),
	}
}

// Run reconciles the index, then serves the control socket until it errors.
func (d *Daemon) Run(ctx context.Context, socketPath string) error {
	if err := d.store.EnsureSchema(ctx); err != nil {
		return err
	}
	go func() {
		d.Reconcile(ctx)
		d.watch(ctx) // live updates after the initial reconcile
	}()
	log.Printf("search daemon listening on %s", socketPath)
	return Serve(ctx, socketPath, d.handle)
}

// candidate is a file the reconcile has decided needs (re)indexing.
type candidate struct {
	path string
	info fs.FileInfo
}

// Reconcile walks the roots, (re)indexes new or changed files, and removes index
// entries whose files are gone. The expensive embed step is gated by mtime+size.
func (d *Daemon) Reconcile(ctx context.Context) {
	onDisk, todo := d.scanForChanges(ctx)

	d.progress.setPhase("indexing")
	d.progress.addTotal(len(todo))
	reindexed := d.indexAll(ctx, todo)

	d.removeMissing(ctx, onDisk)
	d.progress.setPhase("idle")
	log.Printf("reconcile done: %d changed", reindexed)
}

// scanForChanges walks the roots once, returning the set of paths on disk and the
// files that need (re)indexing. Pre-counting gives a stable 0..N progress so the
// UI shows a steady "Indexing k/N" instead of a count that climbs on both ends.
func (d *Daemon) scanForChanges(ctx context.Context) (map[string]bool, []candidate) {
	onDisk := map[string]bool{}
	var todo []candidate
	walkFiles(d.roots, func(path string, info fs.FileInfo) {
		onDisk[path] = true
		if !d.indexer.Unchanged(ctx, path, info) {
			todo = append(todo, candidate{path, info})
		}
	})
	return onDisk, todo
}

// indexAll runs the two-stage index pipeline: a pool of workers extracts, chunks,
// and tokenizes files in parallel (the CPU-heavy BM25 prep), feeding a single
// consumer that embeds and writes each file to the store. Embeddings stay serial
// because the ONNX model is single-threaded; the worker count is capped so
// indexing never hogs every core.
func (d *Daemon) indexAll(ctx context.Context, todo []candidate) int {
	workers := indexWorkers()
	jobs := make(chan candidate)
	prepared := make(chan preparedFile, workers)

	var group sync.WaitGroup
	for worker := 0; worker < workers; worker++ {
		group.Add(1)
		go func() {
			defer group.Done()
			for item := range jobs {
				result, err := d.indexer.Prepare(ctx, item.path, item.info)
				if err != nil {
					log.Printf("prepare %s: %v", item.path, err)
					d.progress.addDone(1)
					continue
				}
				prepared <- result
			}
		}()
	}

	go func() {
		for _, item := range todo {
			jobs <- item
		}
		close(jobs)
		group.Wait()
		close(prepared)
	}()

	reindexed := 0
	for result := range prepared {
		if err := d.indexer.Finalize(ctx, result); err != nil {
			log.Printf("index %s: %v", result.file.Path, err)
		} else {
			reindexed++
		}
		d.progress.addDone(1)
	}
	return reindexed
}

// indexWorkers is the number of parallel prepare workers. It defaults to a
// quarter of the CPUs (min 1) so indexing never hogs the machine, and can be
// overridden with NEOSHELL_INDEX_WORKERS.
func indexWorkers() int {
	if raw := os.Getenv("NEOSHELL_INDEX_WORKERS"); raw != "" {
		if value, err := strconv.Atoi(raw); err == nil && value > 0 {
			return value
		}
	}
	workers := runtime.NumCPU() / 4
	if workers < 1 {
		workers = 1
	}
	return workers
}

func (d *Daemon) removeMissing(ctx context.Context, onDisk map[string]bool) {
	paths, err := d.store.AllPaths(ctx)
	if err != nil {
		return
	}
	for _, path := range paths {
		if onDisk[path] {
			continue
		}
		if _, statErr := os.Stat(path); statErr != nil {
			_ = d.store.DeleteFile(ctx, path)
		}
	}
}

func (d *Daemon) handle(request Request) Response {
	ctx := context.Background()
	switch request.Op {
	case "ping":
		return Response{}
	case "progress":
		info := d.progress.snapshot()
		return Response{Progress: &info}
	case "query":
		hits, err := Search(ctx, d.store, d.embedder, request.Text, request.Limit)
		if err != nil {
			return Response{Error: err.Error()}
		}
		return Response{Hits: hits}
	default:
		return Response{Error: "unknown op: " + request.Op}
	}
}
