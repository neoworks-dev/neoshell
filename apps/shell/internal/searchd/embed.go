package searchd

import "context"

// Embedder turns text and images into vectors in the shared 768-d Nomic space.
// The concrete implementation (ONNX, in-process) lives in the searchd/onnx
// subpackage so its cgo dependency stays out of the pure-Go core; the daemon
// binary wires it in. A nil embedder means filename/BM25-only indexing.
type Embedder interface {
	EmbedDocuments(ctx context.Context, texts []string) ([][]float32, error)
	EmbedQuery(ctx context.Context, query string) ([]float32, error)
	// EmbedImage embeds an image directly (nomic-embed-vision) into the same
	// 768-d space as text, giving cross-modal text->image search.
	EmbedImage(ctx context.Context, path string) ([]float32, error)
	// Available reports whether embeddings can be produced, so the daemon can
	// degrade to filename/BM25-only indexing when models are missing.
	Available(ctx context.Context) bool
}
