package searchd

import "context"

// FileRecord is the indexed metadata for one filesystem path.
type FileRecord struct {
	Path  string
	Name  string
	Mtime int64
	Hash  string
	IsDir bool
}

// ChunkRecord is one indexed unit: a text chunk or a whole image, with its
// embedding in the shared 768-d Nomic space.
type ChunkRecord struct {
	Ord       int
	Text      string
	Modality  string // "text" | "image"
	Embedding []float32
}

// Scored is a ranked chunk hit from one retrieval method (BM25 or vector).
type Scored struct {
	Path     string
	Name     string
	IsDir    bool
	Snippet  string
	Modality string
	Score    float64
}

// Store is the index backend. The Surreal implementation is the real one; the
// in-memory implementation backs unit tests and the offline fallback.
type Store interface {
	EnsureSchema(ctx context.Context) error
	// GetFile returns the stored record for path, or ok=false if unindexed.
	GetFile(ctx context.Context, path string) (FileRecord, bool, error)
	// AllPaths lists every indexed file path (for reconcile deletion).
	AllPaths(ctx context.Context) ([]string, error)
	// PutFile replaces a file's record and all of its chunks atomically.
	PutFile(ctx context.Context, file FileRecord, chunks []ChunkRecord) error
	// DeleteFile removes a file and its chunks.
	DeleteFile(ctx context.Context, path string) error
	// SearchBM25 ranks chunks by full-text relevance to the given terms.
	SearchBM25(ctx context.Context, terms []string, limit int) ([]Scored, error)
	// SearchVector ranks chunks by cosine similarity to the query embedding.
	SearchVector(ctx context.Context, embedding []float32, limit int) ([]Scored, error)
	Close() error
}
