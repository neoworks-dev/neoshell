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
	return Serve(socketPath, d.handle)
}

// Reconcile walks the roots, (re)indexes new or changed files, and removes index
// entries whose files are gone. The expensive embed step is gated by mtime+size.
func (d *Daemon) Reconcile(ctx context.Context) {
	onDisk := map[string]bool{}
	reindexed := 0
	d.progress.setPhase("indexing")
	walkFiles(d.roots, func(path string, info fs.FileInfo) {
		onDisk[path] = true
		if d.indexer.Unchanged(ctx, path, info) {
			return
		}
		d.progress.addTotal(1)
		if err := d.indexer.IndexFile(ctx, path, info); err == nil {
			reindexed++
		} else {
			log.Printf("index %s: %v", path, err)
		}
		d.progress.addDone(1)
	})
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
