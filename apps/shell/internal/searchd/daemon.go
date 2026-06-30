package searchd

import (
	"context"
	"io/fs"
	"log"
	"os"
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

// Reconcile walks the roots, (re)indexes new or changed files, and removes index
// entries whose files are gone. The expensive embed step is gated by mtime+size.
func (d *Daemon) Reconcile(ctx context.Context) {
	// First pass: find files needing (re)index. Pre-counting gives a stable 0..N
	// progress so the UI shows a steady "Indexing k/N" for the whole run, instead
	// of a count that flickers because total and done climb together.
	onDisk := map[string]bool{}
	type candidate struct {
		path string
		info fs.FileInfo
	}
	var todo []candidate
	walkFiles(d.roots, func(path string, info fs.FileInfo) {
		onDisk[path] = true
		if !d.indexer.Unchanged(ctx, path, info) {
			todo = append(todo, candidate{path, info})
		}
	})

	// Second pass: index, advancing progress toward the known total.
	d.progress.setPhase("indexing")
	d.progress.addTotal(len(todo))
	reindexed := 0
	for _, item := range todo {
		if err := d.indexer.IndexFile(ctx, item.path, item.info); err == nil {
			reindexed++
		} else {
			log.Printf("index %s: %v", item.path, err)
		}
		d.progress.addDone(1)
	}

	d.removeMissing(ctx, onDisk)
	d.progress.setPhase("idle")
	log.Printf("reconcile done: %d changed", reindexed)
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
