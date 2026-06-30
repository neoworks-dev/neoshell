package searchd

import (
	"context"
	"math"
	"sort"
	"strings"
	"sync"
)

// memStore is an in-memory Store: it backs unit tests and the offline fallback
// when SurrealDB is unavailable. BM25 here is a simplified tf-idf-ish ranking —
// good enough for the fallback, not a substitute for Surreal's analyzer.
type memStore struct {
	mu     sync.RWMutex
	files  map[string]FileRecord
	chunks map[string][]ChunkRecord // keyed by file path
}

func newMemStore() *memStore {
	return &memStore{
		files:  map[string]FileRecord{},
		chunks: map[string][]ChunkRecord{},
	}
}

func (s *memStore) EnsureSchema(context.Context) error { return nil }

func (s *memStore) GetFile(_ context.Context, path string) (FileRecord, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	record, ok := s.files[path]
	return record, ok, nil
}

func (s *memStore) AllPaths(context.Context) ([]string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	paths := make([]string, 0, len(s.files))
	for path := range s.files {
		paths = append(paths, path)
	}
	return paths, nil
}

func (s *memStore) PutFile(_ context.Context, file FileRecord, chunks []ChunkRecord) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.files[file.Path] = file
	if len(chunks) == 0 {
		delete(s.chunks, file.Path)
	} else {
		s.chunks[file.Path] = chunks
	}
	return nil
}

func (s *memStore) DeleteFile(_ context.Context, path string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.files, path)
	delete(s.chunks, path)
	return nil
}

func (s *memStore) SearchBM25(_ context.Context, terms []string, limit int) ([]Scored, error) {
	if len(terms) == 0 {
		return nil, nil
	}
	s.mu.RLock()
	defer s.mu.RUnlock()

	var scored []Scored
	for path, chunks := range s.chunks {
		file := s.files[path]
		for _, chunk := range chunks {
			score := termOverlap(chunk.Text, terms)
			if score <= 0 {
				continue
			}
			scored = append(scored, s.toScored(file, chunk, score))
		}
	}
	return topN(scored, limit), nil
}

func (s *memStore) SearchVector(_ context.Context, embedding []float32, limit int) ([]Scored, error) {
	if len(embedding) == 0 {
		return nil, nil
	}
	s.mu.RLock()
	defer s.mu.RUnlock()

	var scored []Scored
	for path, chunks := range s.chunks {
		file := s.files[path]
		for _, chunk := range chunks {
			if len(chunk.Embedding) == 0 {
				continue
			}
			score := cosine(embedding, chunk.Embedding)
			scored = append(scored, s.toScored(file, chunk, float64(score)))
		}
	}
	return topN(scored, limit), nil
}

func (s *memStore) Close() error { return nil }

func (s *memStore) toScored(file FileRecord, chunk ChunkRecord, score float64) Scored {
	return Scored{
		Path:     file.Path,
		Name:     file.Name,
		IsDir:    file.IsDir,
		Snippet:  snippet(chunk.Text),
		Modality: chunk.Modality,
		Score:    score,
	}
}

func termOverlap(text string, terms []string) float64 {
	lower := strings.ToLower(text)
	var score float64
	for _, term := range terms {
		score += float64(strings.Count(lower, term))
	}
	return score
}

func cosine(a, b []float32) float32 {
	if len(a) != len(b) {
		return 0
	}
	var dot, normA, normB float64
	for i := range a {
		dot += float64(a[i]) * float64(b[i])
		normA += float64(a[i]) * float64(a[i])
		normB += float64(b[i]) * float64(b[i])
	}
	if normA == 0 || normB == 0 {
		return 0
	}
	return float32(dot / (math.Sqrt(normA) * math.Sqrt(normB)))
}

func topN(scored []Scored, limit int) []Scored {
	sort.Slice(scored, func(i, j int) bool { return scored[i].Score > scored[j].Score })
	if limit > 0 && len(scored) > limit {
		scored = scored[:limit]
	}
	return scored
}

func snippet(text string) string {
	const max = 160
	trimmed := strings.TrimSpace(strings.ReplaceAll(text, "\n", " "))
	if len(trimmed) <= max {
		return trimmed
	}
	return trimmed[:max] + "…"
}
