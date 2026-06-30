package searchd

import (
	"context"
	"os"
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
