package searchd

import "sort"

// rrfK is the standard Reciprocal Rank Fusion constant: it damps the weight of
// top ranks so a result must rank well across methods to win, not just spike in
// one. 60 is the value from the original RRF paper.
const rrfK = 60.0

// fuse merges ranked result lists (e.g. BM25 + vector) by Reciprocal Rank
// Fusion, dedupes by file path keeping the best chunk's snippet, and returns the
// top `limit` hits. A path's score is the sum over lists of 1/(k+rank).
func fuse(lists [][]Scored, limit int) []Hit {
	type agg struct {
		hit   Hit
		score float64
	}
	byPath := map[string]*agg{}

	for _, list := range lists {
		for rank, scored := range list {
			contribution := 1.0 / (rrfK + float64(rank))
			existing, ok := byPath[scored.Path]
			if !ok {
				byPath[scored.Path] = &agg{
					hit: Hit{
						Path:     scored.Path,
						Name:     scored.Name,
						IsDir:    scored.IsDir,
						Snippet:  scored.Snippet,
						Modality: scored.Modality,
					},
					score: contribution,
				}
				continue
			}
			existing.score += contribution
			// Keep the snippet from the higher-ranked chunk (earlier rank, and the
			// first list visited wins ties), so the shown excerpt is the strongest.
			if existing.hit.Snippet == "" && scored.Snippet != "" {
				existing.hit.Snippet = scored.Snippet
			}
		}
	}

	fused := make([]*agg, 0, len(byPath))
	for _, item := range byPath {
		item.hit.Score = item.score
		fused = append(fused, item)
	}
	sort.Slice(fused, func(i, j int) bool {
		if fused[i].score != fused[j].score {
			return fused[i].score > fused[j].score
		}
		return fused[i].hit.Path < fused[j].hit.Path
	})

	if limit > 0 && len(fused) > limit {
		fused = fused[:limit]
	}
	hits := make([]Hit, len(fused))
	for i, item := range fused {
		hits[i] = item.hit
	}
	return hits
}
