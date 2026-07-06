package searchd

import (
	"context"
	"testing"
)

// stubEmbedder returns a fixed query vector so Rerank scoring is deterministic.
type stubEmbedder struct {
	query     []float32
	available bool
}

func (s stubEmbedder) EmbedDocuments(context.Context, []string) ([][]float32, error) {
	return nil, nil
}
func (s stubEmbedder) EmbedQuery(context.Context, string) ([]float32, error) {
	return s.query, nil
}
func (s stubEmbedder) EmbedImage(context.Context, string) ([]float32, error) {
	return nil, nil
}
func (s stubEmbedder) Available(context.Context) bool { return s.available }

func seedRerankStore(t *testing.T) Store {
	t.Helper()
	ctx := context.Background()
	store := newMemStore()
	files := map[string][]float32{"/a": {1, 0, 0}, "/b": {0, 1, 0}}
	for path, embedding := range files {
		file := FileRecord{Path: path, Name: path[1:], Hash: "h"}
		chunk := ChunkRecord{Ord: 0, Text: "text", Modality: "text", Embedding: embedding}
		if err := store.PutFile(ctx, file, []ChunkRecord{chunk}); err != nil {
			t.Fatal(err)
		}
	}
	return store
}

func TestRerankOrdersBySimilarity(t *testing.T) {
	store := seedRerankStore(t)
	embedder := stubEmbedder{query: []float32{1, 0, 0}, available: true}

	// Query matches /a; candidates are given worst-first to prove reordering.
	hits := Rerank(context.Background(), store, embedder, "q", []string{"/b", "/a"}, 2)
	if len(hits) != 2 {
		t.Fatalf("len = %d, want 2", len(hits))
	}
	if hits[0].Path != "/a" || hits[1].Path != "/b" {
		t.Fatalf("order = %v, want [/a /b]", []string{hits[0].Path, hits[1].Path})
	}
	if hits[0].Name != "a" {
		t.Fatalf("expected base name, got %q", hits[0].Name)
	}
}

func TestRerankWithoutEmbedderKeepsOrder(t *testing.T) {
	store := seedRerankStore(t)
	embedder := stubEmbedder{available: false}

	hits := Rerank(context.Background(), store, embedder, "q", []string{"/b", "/a"}, 2)
	if len(hits) != 2 || hits[0].Path != "/b" || hits[1].Path != "/a" {
		t.Fatalf("expected input order preserved, got %+v", hits)
	}
}

func TestRerankLimit(t *testing.T) {
	store := seedRerankStore(t)
	embedder := stubEmbedder{query: []float32{1, 0, 0}, available: true}

	hits := Rerank(context.Background(), store, embedder, "q", []string{"/b", "/a"}, 1)
	if len(hits) != 1 || hits[0].Path != "/a" {
		t.Fatalf("expected top-1 = /a, got %+v", hits)
	}
}
