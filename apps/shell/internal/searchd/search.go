package searchd

import "context"

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
			if vecErr == nil && len(vectorHits) > 0 {
				lists = append(lists, vectorHits)
			}
		}
	}

	return fuse(lists, limit), nil
}
