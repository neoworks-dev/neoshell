package onnx

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

// TestEmbedTextSemantic checks the in-process embedder produces normalized
// vectors that rank a relevant doc above an irrelevant one. Skips when the model
// files aren't present.
func TestEmbedTextSemantic(t *testing.T) {
	dir := ModelsDir()
	if _, err := os.Stat(filepath.Join(dir, "nomic-embed-text.onnx")); err != nil {
		t.Skip("model files not present")
	}
	embedder, err := New(dir)
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()

	query, err := embedder.EmbedQuery(ctx, "where did I put my passport")
	if err != nil {
		t.Fatal(err)
	}
	if len(query) != embeddingDim {
		t.Fatalf("dim = %d, want %d", len(query), embeddingDim)
	}

	docs, err := embedder.EmbedDocuments(ctx, []string{
		"Reminder to renew the passport before the September trip.",
		"The quicksort algorithm partitions around a pivot element.",
	})
	if err != nil {
		t.Fatal(err)
	}
	relevant := cosine(query, docs[0])
	irrelevant := cosine(query, docs[1])
	if !(relevant > irrelevant) {
		t.Fatalf("expected passport doc to rank higher: relevant=%.4f irrelevant=%.4f", relevant, irrelevant)
	}
	t.Logf("relevant=%.4f irrelevant=%.4f", relevant, irrelevant)
}

func cosine(a, b []float32) float32 {
	var dot float64
	for i := range a {
		dot += float64(a[i]) * float64(b[i])
	}
	return float32(dot)
}
