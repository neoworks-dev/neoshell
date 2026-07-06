// Package onnx is the in-process embedding backend: it runs nomic-embed-text
// (and nomic-embed-vision) via onnxruntime, replacing the external Ollama server.
// It is the only cgo dependency in the search daemon, kept in its own package so
// the pure-Go core never pulls in onnxruntime.
package onnx

import (
	"context"
	"fmt"
	"log"
	"math"
	"os"
	"path/filepath"
	"strconv"
	"sync"
	"time"

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

// Embedder runs the Nomic models in-process. Sessions are loaded lazily and, when
// idle-unload is enabled, released after a period of inactivity to free GPU/RAM;
// they rebuild transparently on the next embed. Reloading per call would be
// unusable (the model is hundreds of MB), so we only unload after a long idle.
type Embedder struct {
	dir       string
	tokenizer *tokenizer.Tokenizer

	mu          sync.Mutex // onnxruntime sessions are not safe for concurrent Run
	textSession *ort.DynamicAdvancedSession
	vision      *visionSession  // nil until the vision model is loaded (Phase 3)
	queryCache  *embeddingCache // caches query embeddings (lookups repeat constantly)

	capable     bool          // model files present, so Available() stays true when unloaded
	lastUsed    time.Time     // updated on every embed, for idle detection
	idleTimeout time.Duration // 0 disables idle-unload (sessions stay resident)
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

	embedder := &Embedder{
		dir:         dir,
		tokenizer:   tk,
		queryCache:  newEmbeddingCache(queryCacheSize),
		capable:     true,
		idleTimeout: idleTimeout(),
	}
	embedder.mu.Lock()
	err = embedder.ensureLoadedLocked()
	embedder.mu.Unlock()
	if err != nil {
		return nil, fmt.Errorf("load text model: %w", err)
	}
	if embedder.idleTimeout > 0 {
		go embedder.idleWatcher()
	}
	return embedder, nil
}

// Available reports capability, not load state: the daemon must keep using the
// embedder even while its sessions are idle-unloaded (they rebuild on demand).
func (e *Embedder) Available(context.Context) bool { return e != nil && e.capable }

// ensureLoadedLocked rebuilds the text (and optional vision) sessions if they are
// not resident. Caller holds e.mu.
func (e *Embedder) ensureLoadedLocked() error {
	if e.textSession != nil {
		return nil
	}
	session, err := newSession(
		filepath.Join(e.dir, "nomic-embed-text.onnx"),
		[]string{"input_ids", "token_type_ids", "attention_mask"},
		[]string{"last_hidden_state"},
	)
	if err != nil {
		return err
	}
	e.textSession = session
	// Vision model is optional: absent → images stay filename-only.
	e.vision = loadVision(e.dir)
	e.lastUsed = time.Now()
	return nil
}

// unloadLocked destroys the resident sessions, freeing GPU/RAM. Caller holds e.mu.
func (e *Embedder) unloadLocked() {
	if e.textSession != nil {
		e.textSession.Destroy()
		e.textSession = nil
	}
	if e.vision != nil {
		e.vision.session.Destroy()
		e.vision = nil
	}
}

// idleWatcher unloads the sessions once they have gone unused for idleTimeout.
func (e *Embedder) idleWatcher() {
	ticker := time.NewTicker(e.idleTimeout)
	defer ticker.Stop()
	for range ticker.C {
		e.mu.Lock()
		if e.textSession != nil && time.Since(e.lastUsed) >= e.idleTimeout {
			e.unloadLocked()
			log.Printf("onnx: embedder idle for %s — unloaded, freed GPU/RAM", e.idleTimeout)
		}
		e.mu.Unlock()
	}
}

// idleTimeout reads NEOSHELL_ONNX_IDLE_UNLOAD (seconds). Default 120s; a value of
// 0 (or invalid) disables idle-unload, keeping sessions resident.
func idleTimeout() time.Duration {
	raw := os.Getenv("NEOSHELL_ONNX_IDLE_UNLOAD")
	if raw == "" {
		return 120 * time.Second
	}
	seconds, err := strconv.Atoi(raw)
	if err != nil || seconds <= 0 {
		return 0
	}
	return time.Duration(seconds) * time.Second
}

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
	if err = e.ensureLoadedLocked(); err != nil {
		e.mu.Unlock()
		return nil, err
	}
	e.lastUsed = time.Now()
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
