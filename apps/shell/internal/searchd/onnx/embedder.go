// Package onnx is the in-process embedding backend: it runs nomic-embed-text
// (and nomic-embed-vision) via onnxruntime, replacing the external Ollama server.
// It is the only cgo dependency in the search daemon, kept in its own package so
// the pure-Go core never pulls in onnxruntime.
package onnx

import (
	"context"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"sync"

	"github.com/sugarme/tokenizer"
	"github.com/sugarme/tokenizer/pretrained"
	ort "github.com/yalue/onnxruntime_go"
)

const embeddingDim = 768

// Nomic task prefixes — documents and queries must use matching prefixes to land
// in the same space.
const (
	docPrefix   = "search_document: "
	queryPrefix = "search_query: "
)

// ortOnce guards the single process-wide onnxruntime environment init.
var (
	ortOnce sync.Once
	ortErr  error
)

func initRuntime(libPath string) error {
	ortOnce.Do(func() {
		ort.SetSharedLibraryPath(libPath)
		ortErr = ort.InitializeEnvironment()
	})
	return ortErr
}

// Embedder runs the Nomic models in-process. Sessions are created once and reused
// (the model is hundreds of MB — loading per call would be unusable).
type Embedder struct {
	dir       string
	tokenizer *tokenizer.Tokenizer

	mu        sync.Mutex // onnxruntime sessions are not safe for concurrent Run
	textSession  *ort.DynamicAdvancedSession
	vision    *visionSession // nil until the vision model is loaded (Phase 3)
	queryCache *embeddingCache    // caches query embeddings (lookups repeat constantly)
}

// ModelsDir resolves where the libonnxruntime.so and *.onnx model files live.
func ModelsDir() string {
	if dir := os.Getenv("NEOSHELL_MODELS_DIR"); dir != "" {
		return dir
	}
	base := os.Getenv("XDG_DATA_HOME")
	if base == "" {
		base = filepath.Join(os.Getenv("HOME"), ".local", "share")
	}
	return filepath.Join(base, "neoshell", "models")
}

// New loads the runtime, tokenizer, and text model. Returns an error (so the
// daemon falls back to filename/BM25-only) when the model files are absent.
func New(dir string) (*Embedder, error) {
	for _, name := range []string{"libonnxruntime.so", "nomic-embed-text.onnx", "tokenizer.json"} {
		if _, err := os.Stat(filepath.Join(dir, name)); err != nil {
			return nil, fmt.Errorf("missing model file %s in %s", name, dir)
		}
	}
	if err := initRuntime(filepath.Join(dir, "libonnxruntime.so")); err != nil {
		return nil, fmt.Errorf("onnxruntime init: %w", err)
	}

	tk, err := pretrained.FromFile(filepath.Join(dir, "tokenizer.json"))
	if err != nil {
		return nil, fmt.Errorf("load tokenizer: %w", err)
	}

	session, err := newSession(
		filepath.Join(dir, "nomic-embed-text.onnx"),
		[]string{"input_ids", "token_type_ids", "attention_mask"},
		[]string{"last_hidden_state"},
	)
	if err != nil {
		return nil, fmt.Errorf("load text model: %w", err)
	}
	// Vision model is optional: absent → images stay filename-only.
	return &Embedder{
		dir: dir, tokenizer: tk, textSession: session,
		vision:    loadVision(dir),
		queryCache: newEmbeddingCache(queryCacheSize),
	}, nil
}

func (e *Embedder) Available(context.Context) bool { return e != nil && e.textSession != nil }

func (e *Embedder) EmbedQuery(_ context.Context, query string) ([]float32, error) {
	if e.queryCache != nil {
		if cached, ok := e.queryCache.get(query); ok {
			return cached, nil
		}
	}
	vector, err := e.embedText(queryPrefix + query)
	if err != nil {
		return nil, err
	}
	if e.queryCache != nil {
		e.queryCache.put(query, vector)
	}
	return vector, nil
}

func (e *Embedder) EmbedDocuments(_ context.Context, texts []string) ([][]float32, error) {
	vectors := make([][]float32, len(texts))
	for i, text := range texts {
		vector, err := e.embedText(docPrefix + text)
		if err != nil {
			return nil, err
		}
		vectors[i] = vector
	}
	return vectors, nil
}

// embedText tokenizes, runs the model, masked-mean-pools, and L2-normalizes.
func (e *Embedder) embedText(text string) ([]float32, error) {
	encoding, err := e.tokenizer.EncodeSingle(text)
	if err != nil {
		return nil, err
	}
	ids, mask, types := toInt64(encoding.GetIds()), toInt64(encoding.GetAttentionMask()), toInt64(encoding.GetTypeIds())
	seq := int64(len(ids))
	if seq == 0 {
		return make([]float32, embeddingDim), nil
	}

	shape := ort.NewShape(1, seq)
	idsT, err := ort.NewTensor(shape, ids)
	if err != nil {
		return nil, err
	}
	defer idsT.Destroy()
	maskT, err := ort.NewTensor(shape, mask)
	if err != nil {
		return nil, err
	}
	defer maskT.Destroy()
	typeT, err := ort.NewTensor(shape, types)
	if err != nil {
		return nil, err
	}
	defer typeT.Destroy()
	out, err := ort.NewEmptyTensor[float32](ort.NewShape(1, seq, embeddingDim))
	if err != nil {
		return nil, err
	}
	defer out.Destroy()

	e.mu.Lock()
	err = e.textSession.Run(
		[]ort.ArbitraryTensor{idsT, typeT, maskT},
		[]ort.ArbitraryTensor{out},
	)
	e.mu.Unlock()
	if err != nil {
		return nil, err
	}
	return normalize(meanPool(out.GetData(), mask, int(seq))), nil
}

func toInt64(values []int) []int64 {
	out := make([]int64, len(values))
	for i, v := range values {
		out[i] = int64(v)
	}
	return out
}

func meanPool(hidden []float32, mask []int64, seq int) []float32 {
	pooled := make([]float32, embeddingDim)
	var count float32
	for t := 0; t < seq; t++ {
		if mask[t] == 0 {
			continue
		}
		count++
		offset := t * embeddingDim
		for d := 0; d < embeddingDim; d++ {
			pooled[d] += hidden[offset+d]
		}
	}
	if count > 0 {
		for d := range pooled {
			pooled[d] /= count
		}
	}
	return pooled
}

func normalize(v []float32) []float32 {
	var sum float64
	for _, x := range v {
		sum += float64(x) * float64(x)
	}
	norm := float32(math.Sqrt(sum))
	if norm == 0 {
		return v
	}
	for i := range v {
		v[i] /= norm
	}
	return v
}
