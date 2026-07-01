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

// preparedFile is the CPU-side result of indexing a file: text extracted,
// chunked, and tokenized for BM25 — everything except the serial embed step.
// Splitting prepare from finalize lets the reconcile pipeline run the CPU-heavy
// extract/chunk/tokenize work across many cores while embeddings stay serial.
type preparedFile struct {
	file       FileRecord
	chunks     []ChunkRecord
	embedText  bool     // chunks are prose to embed with EmbedDocuments
	textPieces []string // prose chunk texts awaiting embedding, aligned to chunks
	embedImage bool     // single image chunk to embed with EmbedImage
	imagePath  string
}

// IndexFile (re)indexes a single regular file end to end. Used by the file
// watcher; the batch reconcile uses Prepare + Finalize directly so it can
// parallelize the prepare stage.
func (ix *Indexer) IndexFile(ctx context.Context, path string, info os.FileInfo) error {
	prepared, err := ix.Prepare(ctx, path, info)
	if err != nil {
		return err
	}
	return ix.Finalize(ctx, prepared)
}

// Prepare does the CPU-bound, embedder-free half of indexing: classify, extract,
// chunk, and tokenize. Safe to call concurrently — it touches no shared state.
func (ix *Indexer) Prepare(_ context.Context, path string, info os.FileInfo) (preparedFile, error) {
	name := filepath.Base(path)
	prepared := preparedFile{
		file: FileRecord{
			Path:  path,
			Name:  name,
			Mtime: info.ModTime().UnixNano(),
			Hash:  fileGate(info),
			IsDir: false,
		},
	}
	switch classify(path) {
	case KindText, KindPDF:
		ix.prepareText(&prepared, path, name)
	case KindImage:
		prepared.chunks = []ChunkRecord{nameChunk(name, "image")}
		prepared.embedImage = true
		prepared.imagePath = path
	default:
		// Filename-only: a single un-embedded chunk so BM25 can match the name.
		prepared.chunks = []ChunkRecord{nameChunk(name, "name")}
	}
	return prepared, nil
}

// prepareText extracts and chunks a text/PDF file, tokenizing each chunk for BM25.
// Prose is flagged for embedding; code is left BM25-only (nomic-embed-text adds
// little semantic value over code). Unreadable/binary files fall back to a
// filename-only chunk so they stay findable.
func (ix *Indexer) prepareText(prepared *preparedFile, path, name string) {
	kind := classify(path)
	text, err := extractText(path, kind)
	if err != nil || text == "" {
		prepared.chunks = []ChunkRecord{nameChunk(name, "name")}
		return
	}
	pieces := chunkText(text, defaultChunkSize, defaultChunkOverlap)
	chunks := make([]ChunkRecord, len(pieces))
	for i, piece := range pieces {
		chunks[i] = ChunkRecord{Ord: i, Text: piece, Modality: "text", Terms: tokenize(piece)}
	}
	prepared.chunks = chunks
	if isProse(path, kind) {
		prepared.embedText = true
		prepared.textPieces = pieces
	}
}

// nameChunk builds a filename-only chunk with its name pre-tokenized for BM25.
func nameChunk(name, modality string) ChunkRecord {
	return ChunkRecord{Ord: 0, Text: name, Modality: modality, Terms: tokenize(name)}
}

// Finalize does the serial half: it attaches embeddings (when an embedder is
// available) and writes the file and its chunks to the store. Embeddings run one
// file at a time by design — the ONNX model is single-threaded — so this must not
// be called concurrently.
func (ix *Indexer) Finalize(ctx context.Context, prepared preparedFile) error {
	if ix.embedder != nil && ix.embedder.Available(ctx) {
		if prepared.embedText {
			ix.attachTextEmbeddings(ctx, prepared.chunks, prepared.textPieces)
		}
		if prepared.embedImage {
			ix.attachImageEmbedding(ctx, prepared.chunks, prepared.imagePath)
		}
	}
	return ix.store.PutFile(ctx, prepared.file, prepared.chunks)
}

// attachTextEmbeddings fills in embeddings; on any failure the chunks keep their
// text (BM25 still works), just without vectors.
func (ix *Indexer) attachTextEmbeddings(ctx context.Context, chunks []ChunkRecord, pieces []string) {
	vectors, err := ix.embedder.EmbedDocuments(ctx, pieces)
	if err != nil || len(vectors) != len(chunks) {
		return
	}
	for i := range chunks {
		chunks[i].Embedding = vectors[i]
	}
}

// attachImageEmbedding embeds the image directly with the vision model
// (nomic-embed-vision) into the shared text space, so a text query matches it.
func (ix *Indexer) attachImageEmbedding(ctx context.Context, chunks []ChunkRecord, path string) {
	if len(chunks) == 0 {
		return
	}
	if vector, err := ix.embedder.EmbedImage(ctx, path); err == nil {
		chunks[0].Embedding = vector
	}
}
