package searchd

import (
	"context"
	"reflect"
	"strings"
	"testing"
)

func TestQueryTermsStripsStopwordsAndShort(t *testing.T) {
	got := queryTerms("The Quick a brown FOX, in the box!")
	want := []string{"quick", "brown", "fox", "box"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("queryTerms = %v, want %v", got, want)
	}
}

func TestChunkTextOverlapAndCoverage(t *testing.T) {
	text := strings.Repeat("abcde fghij\n", 400) // ~4800 chars
	chunks := chunkText(text, 1000, 150)
	if len(chunks) < 2 {
		t.Fatalf("expected multiple chunks, got %d", len(chunks))
	}
	for _, chunk := range chunks {
		if len([]rune(chunk)) > 1000 {
			t.Fatalf("chunk exceeds size: %d runes", len([]rune(chunk)))
		}
	}
}

func TestChunkTextEmpty(t *testing.T) {
	if chunks := chunkText("   \n  ", 100, 10); chunks != nil {
		t.Fatalf("expected nil for blank input, got %v", chunks)
	}
}

func TestFuseRanksCrossListAgreement(t *testing.T) {
	// /a appears in both lists (lower combined rank) → must beat single-list hits.
	bm25 := []Scored{{Path: "/x"}, {Path: "/a"}}
	vector := []Scored{{Path: "/a"}, {Path: "/y"}}
	hits := fuse([][]Scored{bm25, vector}, 10)
	if len(hits) == 0 || hits[0].Path != "/a" {
		t.Fatalf("expected /a first, got %+v", hits)
	}
}

func TestFuseLimit(t *testing.T) {
	list := []Scored{{Path: "/a"}, {Path: "/b"}, {Path: "/c"}}
	if hits := fuse([][]Scored{list}, 2); len(hits) != 2 {
		t.Fatalf("expected 2 hits, got %d", len(hits))
	}
}

func TestMemStorePutAndSearch(t *testing.T) {
	ctx := context.Background()
	store := newMemStore()
	file := FileRecord{Path: "/notes/todo.md", Name: "todo.md", Hash: "h1"}
	chunks := []ChunkRecord{
		{Ord: 0, Text: "buy milk and bread for breakfast", Modality: "text", Embedding: []float32{1, 0, 0}},
		{Ord: 1, Text: "call the dentist tomorrow", Modality: "text", Embedding: []float32{0, 1, 0}},
	}
	if err := store.PutFile(ctx, file, chunks); err != nil {
		t.Fatal(err)
	}

	bm25, err := store.SearchBM25(ctx, []string{"dentist"}, 10)
	if err != nil || len(bm25) == 0 || bm25[0].Path != "/notes/todo.md" {
		t.Fatalf("bm25 miss: %v %+v", err, bm25)
	}

	vec, err := store.SearchVector(ctx, []float32{1, 0, 0}, 10)
	if err != nil || len(vec) == 0 {
		t.Fatalf("vector miss: %v %+v", err, vec)
	}
	if vec[0].Snippet == "" {
		t.Fatalf("expected snippet on vector hit")
	}
}

func TestMemStoreUnchangedGate(t *testing.T) {
	ctx := context.Background()
	store := newMemStore()
	_ = store.PutFile(ctx, FileRecord{Path: "/a", Name: "a", Hash: "g1"}, nil)
	record, ok, _ := store.GetFile(ctx, "/a")
	if !ok || record.Hash != "g1" {
		t.Fatalf("get file failed: %+v ok=%v", record, ok)
	}
}

func TestClassify(t *testing.T) {
	cases := map[string]Kind{
		"/a/readme.md":   KindText,
		"/a/main.go":     KindText,
		"/a/photo.png":   KindImage,
		"/a/doc.pdf":     KindPDF,
		"/a/Makefile":    KindText,
		"/a/binary.bin":  KindSkip,
		"/a/video.mp4":   KindSkip,
	}
	for path, want := range cases {
		if got := classify(path); got != want {
			t.Errorf("classify(%q) = %v, want %v", path, got, want)
		}
	}
}
