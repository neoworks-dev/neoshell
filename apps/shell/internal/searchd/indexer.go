package searchd

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
)

// Indexer turns a filesystem path into stored records: it extracts text, chunks
// it, embeds the chunks (when an embedder is available), and writes the file plus
// its chunks to the store. Without embeddings it still indexes filename + text so
// BM25 works, just without semantic recall.
type Indexer struct {
	store    Store
	embedder Embedder
}

func NewIndexer(store Store, embedder Embedder) *Indexer {
	return &Indexer{store: store, embedder: embedder}
}

// fileGate is a cheap change token (mtime+size) used to skip re-indexing
// unchanged files, avoiding the expensive embed step.
func fileGate(info os.FileInfo) string {
	return fmt.Sprintf("%d-%d", info.ModTime().UnixNano(), info.Size())
}

// Unchanged reports whether path is already indexed at its current gate.
func (ix *Indexer) Unchanged(ctx context.Context, path string, info os.FileInfo) bool {
	record, ok, err := ix.store.GetFile(ctx, path)
	if err != nil || !ok {
		return false
	}
	return record.Hash == fileGate(info)
}

// IndexFile (re)indexes a single regular file, replacing any prior chunks.
func (ix *Indexer) IndexFile(ctx context.Context, path string, info os.FileInfo) error {
	file := FileRecord{
		Path:  path,
		Name:  filepath.Base(path),
		Mtime: info.ModTime().UnixNano(),
		Hash:  fileGate(info),
		IsDir: false,
	}
	chunks, err := ix.buildChunks(ctx, path, file.Name)
	if err != nil {
		return err
	}
	return ix.store.PutFile(ctx, file, chunks)
}

func (ix *Indexer) buildChunks(ctx context.Context, path, name string) ([]ChunkRecord, error) {
	kind := classify(path)
	switch kind {
	case KindText, KindPDF:
		return ix.textChunks(ctx, path, name, kind)
	case KindImage:
		return ix.imageChunk(ctx, path, name)
	default:
		// Filename-only: a single un-embedded chunk so BM25 can match the name.
		return []ChunkRecord{{Ord: 0, Text: name, Modality: "name"}}, nil
	}
}

func (ix *Indexer) textChunks(ctx context.Context, path, name string, kind Kind) ([]ChunkRecord, error) {
	text, err := extractText(path, kind)
	if err != nil || text == "" {
		// Unreadable/binary: fall back to filename-only so it's still findable.
		return []ChunkRecord{{Ord: 0, Text: name, Modality: "name"}}, nil
	}
	pieces := chunkText(text, defaultChunkSize, defaultChunkOverlap)
	chunks := make([]ChunkRecord, len(pieces))
	for i, piece := range pieces {
		chunks[i] = ChunkRecord{Ord: i, Text: piece, Modality: "text"}
	}
	// Embed prose only; code is left BM25-only (still searchable by exact terms),
	// since nomic-embed-text adds little semantic value over code.
	if isProse(path, kind) {
		ix.attachTextEmbeddings(ctx, chunks, pieces)
	}
	return chunks, nil
}

// attachTextEmbeddings fills in embeddings when the embedder is available; on any
// failure the chunks keep their text (BM25 still works), just without vectors.
func (ix *Indexer) attachTextEmbeddings(ctx context.Context, chunks []ChunkRecord, pieces []string) {
	if ix.embedder == nil || !ix.embedder.Available(ctx) {
		return
	}
	vectors, err := ix.embedder.EmbedDocuments(ctx, pieces)
	if err != nil || len(vectors) != len(chunks) {
		return
	}
	for i := range chunks {
		chunks[i].Embedding = vectors[i]
	}
}

// imageChunk captions the image with a vision model and embeds the caption with
// the text model, so images live in the same vector space as documents. The
// caption is also stored as the chunk text, making images BM25-searchable. Falls
// back to filename-only when no embedder is available or captioning fails.
func (ix *Indexer) imageChunk(ctx context.Context, path, name string) ([]ChunkRecord, error) {
	chunk := ChunkRecord{Ord: 0, Text: name, Modality: "image"}
	if ix.embedder == nil || !ix.embedder.Available(ctx) {
		return []ChunkRecord{chunk}, nil
	}

	caption, err := ix.embedder.DescribeImage(ctx, path)
	if err != nil || caption == "" {
		return []ChunkRecord{chunk}, nil
	}
	// Caption plus filename: the name often carries extra signal (e.g. a project).
	chunk.Text = caption + " — " + name

	vectors, err := ix.embedder.EmbedDocuments(ctx, []string{chunk.Text})
	if err == nil && len(vectors) == 1 {
		chunk.Embedding = vectors[0]
	}
	return []ChunkRecord{chunk}, nil
}
