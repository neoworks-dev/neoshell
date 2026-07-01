package searchd

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestPathPriorityRanksDocumentsAboveDotfiles(t *testing.T) {
	home, err := os.UserHomeDir()
	if err != nil {
		t.Skip("no home directory")
	}

	doc := PathPriority(filepath.Join(home, "Documents", "report.md"))
	dot := PathPriority(filepath.Join(home, ".config", "app", "note.md"))
	plain := PathPriority(filepath.Join(home, "misc", "note.md"))

	if !(doc > plain && plain > dot) {
		t.Fatalf("expected Documents(%.2f) > plain(%.2f) > dotfile(%.2f)", doc, plain, dot)
	}
}

func TestPathPriorityNeutralOutsideHome(t *testing.T) {
	if got := PathPriority("/etc/hosts"); got != 1.0 {
		t.Fatalf("outside-home priority = %.2f, want 1.0", got)
	}
}

func TestFuseAppliesPathPriority(t *testing.T) {
	home, err := os.UserHomeDir()
	if err != nil {
		t.Skip("no home directory")
	}
	docPath := filepath.Join(home, "Documents", "a.md")
	dotPath := filepath.Join(home, ".cache", "b.md")

	// Same rank in the single input list; only path priority should break the tie.
	list := []Scored{
		{Path: dotPath, Name: "b.md"},
		{Path: docPath, Name: "a.md"},
	}
	hits := fuse([][]Scored{list}, 10)
	if len(hits) != 2 {
		t.Fatalf("expected 2 hits, got %d", len(hits))
	}
	if hits[0].Path != docPath {
		t.Fatalf("expected Documents hit first, got %s", hits[0].Path)
	}
}

// TestPrepareFinalizeIndexesWithoutEmbedder verifies the split pipeline stores a
// file (filename-only chunk, terms tokenized) when no embedder is wired.
func TestPrepareFinalizeIndexesWithoutEmbedder(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "hello.txt")
	if err := os.WriteFile(path, []byte("searchable content here"), 0o644); err != nil {
		t.Fatal(err)
	}
	info, err := os.Stat(path)
	if err != nil {
		t.Fatal(err)
	}

	store := newMemStore()
	indexer := NewIndexer(store, nil)
	ctx := context.Background()

	prepared, err := indexer.Prepare(ctx, path, info)
	if err != nil {
		t.Fatal(err)
	}
	if len(prepared.chunks) == 0 {
		t.Fatal("prepare produced no chunks")
	}
	if prepared.chunks[0].Terms == nil {
		t.Fatal("prepare did not tokenize chunk terms")
	}
	if err := indexer.Finalize(ctx, prepared); err != nil {
		t.Fatal(err)
	}

	hits, err := store.SearchBM25(ctx, []string{"searchable"}, 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(hits) == 0 {
		t.Fatal("indexed file not found via BM25")
	}
}
