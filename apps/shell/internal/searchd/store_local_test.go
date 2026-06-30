package searchd

import (
	"context"
	"path/filepath"
	"testing"
)

func TestLocalStoreBM25AndPersistence(t *testing.T) {
	ctx := context.Background()
	path := filepath.Join(t.TempDir(), "idx.gob")
	store, err := openLocalStore(path)
	if err != nil { t.Fatal(err) }

	store.PutFile(ctx, FileRecord{Path: "/notes.md", Name: "notes.md", Hash: "h1"},
		[]ChunkRecord{{Ord: 0, Text: "renew the passport before the september trip", Modality: "text", Embedding: []float32{1, 0, 0}}})
	store.PutFile(ctx, FileRecord{Path: "/algo.py", Name: "algo.py", Hash: "h2"},
		[]ChunkRecord{{Ord: 0, Text: "quicksort partitions around a pivot", Modality: "text", Embedding: []float32{0, 1, 0}}})

	bm, _ := store.SearchBM25(ctx, []string{"passport"}, 10)
	if len(bm) == 0 || bm[0].Path != "/notes.md" { t.Fatalf("bm25 miss: %+v", bm) }

	vec, _ := store.SearchVector(ctx, []float32{0, 1, 0}, 10)
	if len(vec) == 0 || vec[0].Path != "/algo.py" { t.Fatalf("vector miss: %+v", vec) }

	// delete + gate
	store.DeleteFile(ctx, "/algo.py")
	if _, ok, _ := store.GetFile(ctx, "/algo.py"); ok { t.Fatal("expected deleted") }
	store.Close() // persists

	// reopen -> data survives, index rebuilt
	store2, err := openLocalStore(path)
	if err != nil { t.Fatal(err) }
	defer store2.Close()
	bm2, _ := store2.SearchBM25(ctx, []string{"passport"}, 10)
	if len(bm2) == 0 || bm2[0].Path != "/notes.md" { t.Fatalf("persistence lost: %+v", bm2) }
	if _, ok, _ := store2.GetFile(ctx, "/algo.py"); ok { t.Fatal("deleted file resurrected") }
}
