package searchd

import (
	"context"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
)

// debounceDelay coalesces rapid writes to the same file (editors save in bursts)
// into a single re-index.
const debounceDelay = 400 * time.Millisecond

// watch registers a recursive set of fsnotify watches over the roots and keeps
// the index live: writes/creates re-index (debounced), removes delete, and new
// directories get their own watch. Blocks until ctx is cancelled.
func (d *Daemon) watch(ctx context.Context) {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		log.Printf("watch disabled: %v", err)
		return
	}
	defer watcher.Close()

	walkDirs(d.roots, func(dir string) { _ = watcher.Add(dir) })

	pending := newDebouncer(func(path string) {
		d.reindexPath(ctx, path)
		d.progress.addDone(1)
	})
	defer pending.stop()

	for {
		select {
		case <-ctx.Done():
			return
		case event, ok := <-watcher.Events:
			if !ok {
				return
			}
			d.onFSEvent(watcher, pending, event)
		case err, ok := <-watcher.Errors:
			if !ok {
				return
			}
			log.Printf("watch error: %v", err)
		}
	}
}

func (d *Daemon) onFSEvent(watcher *fsnotify.Watcher, pending *debouncer, event fsnotify.Event) {
	if skipDirs[filepath.Base(event.Name)] {
		return
	}
	switch {
	case event.Op&(fsnotify.Remove|fsnotify.Rename) != 0:
		_ = d.store.DeleteFile(context.Background(), event.Name)
	case event.Op&(fsnotify.Create|fsnotify.Write) != 0:
		info, err := os.Stat(event.Name)
		if err != nil {
			return
		}
		if info.IsDir() {
			// A new directory: watch it and index whatever it already contains.
			_ = watcher.Add(event.Name)
			walkFiles([]string{event.Name}, func(path string, _ os.FileInfo) { d.scheduleIndex(pending, path) })
			return
		}
		d.scheduleIndex(pending, event.Name)
	}
}

// scheduleIndex queues a path for re-indexing and counts it toward progress only
// when it is newly queued (a debounce reset is not new work).
func (d *Daemon) scheduleIndex(pending *debouncer, path string) {
	if pending.schedule(path) {
		d.progress.setPhase("indexing")
		d.progress.addTotal(1)
	}
}

// reindexPath re-indexes a single file unless it is unchanged by the mtime/size
// gate (cheap skip that avoids re-embedding).
func (d *Daemon) reindexPath(ctx context.Context, path string) {
	info, err := os.Stat(path)
	if err != nil || info.IsDir() {
		return
	}
	if d.indexer.Unchanged(ctx, path, info) {
		return
	}
	if err := d.indexer.IndexFile(ctx, path, info); err != nil {
		log.Printf("index %s: %v", path, err)
	}
}

// debouncer coalesces repeated schedule(path) calls within debounceDelay into a
// single fire(path).
type debouncer struct {
	mu     sync.Mutex
	timers map[string]*time.Timer
	fire   func(string)
	closed bool
}

func newDebouncer(fire func(string)) *debouncer {
	return &debouncer{timers: map[string]*time.Timer{}, fire: fire}
}

// schedule (re)arms the debounce timer for path. Returns true only when path was
// not already pending, so the caller can count it as new work exactly once.
func (d *debouncer) schedule(path string) bool {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.closed {
		return false
	}
	if timer, ok := d.timers[path]; ok {
		timer.Reset(debounceDelay)
		return false
	}
	d.timers[path] = time.AfterFunc(debounceDelay, func() {
		d.mu.Lock()
		delete(d.timers, path)
		d.mu.Unlock()
		d.fire(path)
	})
	return true
}

func (d *debouncer) stop() {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.closed = true
	for _, timer := range d.timers {
		timer.Stop()
	}
}
