package searchd

import (
	"context"
	"os"
	"path/filepath"
	"sort"
	"strconv"
)

// defaultVectorFloor is the minimum cosine similarity a vector hit must clear to
// count. HNSW KNN always returns the k nearest chunks regardless of relevance, so
// without a floor a nonsense query still surfaces the closest doc. Override with
// NEOSHELL_VECTOR_FLOOR.
const defaultVectorFloor = 0.5

func vectorFloor() float64 {
	if raw := os.Getenv("NEOSHELL_VECTOR_FLOOR"); raw != "" {
		if value, err := strconv.ParseFloat(raw, 64); err == nil {
			return value
		}
	}
	return defaultVectorFloor
}

// aboveFloor keeps only vector hits whose cosine similarity clears the floor.
func aboveFloor(hits []Scored, floor float64) []Scored {
	kept := hits[:0]
	for _, hit := range hits {
		if hit.Score >= floor {
			kept = append(kept, hit)
		}
	}
	return kept
}

// Search runs the hybrid query: BM25 over query terms plus, when an embedder is
// available, vector KNN over the query embedding — fused by RRF into top hits.
func Search(ctx context.Context, store Store, embedder Embedder, query string, limit int) ([]Hit, error) {
	if limit <= 0 {
		limit = 30
	}
	// Over-fetch each method so the fusion has room before truncation.
	perMethod := limit * 2

	var lists [][]Scored

	terms := queryTerms(query)
	bm25, err := store.SearchBM25(ctx, terms, perMethod)
	if err != nil {
		return nil, err
	}
	if len(bm25) > 0 {
		lists = append(lists, bm25)
	}

	if embedder != nil && embedder.Available(ctx) {
		if vector, embedErr := embedder.EmbedQuery(ctx, query); embedErr == nil {
			vectorHits, vecErr := store.SearchVector(ctx, vector, perMethod)
			if vecErr == nil {
				vectorHits = aboveFloor(vectorHits, vectorFloor())
				if len(vectorHits) > 0 {
					lists = append(lists, vectorHits)
				}
			}
		}
	}

	return fuse(lists, limit), nil
}

// rerankScanDepth is how many nearest chunks to pull when scoring candidates for
// a rerank. It over-fetches well past the candidate count so most candidates get
// a real cosine score rather than sinking to the unscored tail.
const rerankScanDepth = 256

// Rerank reorders candidate paths by pure semantic (Nomic embedding) similarity
// to the query, sharpening the fused BM25+vector order the query op returns. When
// no embedder is available it returns the candidates in their given order.
func Rerank(ctx context.Context, store Store, embedder Embedder, query string, candidates []string, limit int) []Hit {
	if limit <= 0 || limit > len(candidates) {
		limit = len(candidates)
	}
	if len(candidates) == 0 {
		return []Hit{}
	}
	scores, ok := candidateScores(ctx, store, embedder, query, len(candidates))
	if !ok {
		return pathsToHits(candidates, nil, limit)
	}
	ordered := make([]string, len(candidates))
	copy(ordered, candidates)
	// Stable sort keeps the original (fused) order among candidates the vector
	// scan didn't reach, which all share a zero score.
	sort.SliceStable(ordered, func(i, j int) bool {
		return scores[ordered[i]] > scores[ordered[j]]
	})
	return pathsToHits(ordered, scores, limit)
}

// candidateScores maps each candidate's best chunk cosine to the query. ok is
// false when embeddings are unavailable so the caller can keep the input order.
func candidateScores(ctx context.Context, store Store, embedder Embedder, query string, count int) (map[string]float64, bool) {
	if embedder == nil || !embedder.Available(ctx) {
		return nil, false
	}
	vector, err := embedder.EmbedQuery(ctx, query)
	if err != nil {
		return nil, false
	}
	depth := rerankScanDepth
	if count*4 > depth {
		depth = count * 4
	}
	scored, err := store.SearchVector(ctx, vector, depth)
	if err != nil {
		return nil, false
	}
	best := make(map[string]float64, len(scored))
	for _, hit := range scored {
		if current, seen := best[hit.Path]; !seen || hit.Score > current {
			best[hit.Path] = hit.Score
		}
	}
	return best, true
}

func pathsToHits(paths []string, scores map[string]float64, limit int) []Hit {
	if limit > len(paths) {
		limit = len(paths)
	}
	hits := make([]Hit, 0, limit)
	for _, path := range paths[:limit] {
		hit := Hit{Path: path, Name: filepath.Base(path)}
		if scores != nil {
			hit.Score = scores[path]
		}
		hits = append(hits, hit)
	}
	return hits
}
