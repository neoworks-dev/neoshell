package server

import (
	"github.com/neoworks/neoshell/internal/searchd"
)

// searchFiles answers the bar/overlay file search. It prefers the semantic search
// daemon (BM25 + vector over file contents); if the daemon is unreachable it
// falls back to the in-process filename index so search still works.
func (s *Server) searchFiles(query string) []searchd.Hit {
	if query == "" {
		return []searchd.Hit{}
	}
	if hits, ok := s.querySearchDaemon(query); ok {
		return hits
	}
	return s.filenameFallback(query)
}

func (s *Server) querySearchDaemon(query string) ([]searchd.Hit, bool) {
	response, err := searchd.QuerySocket(searchd.SocketPath(), searchd.Request{
		Op:    "query",
		Text:  query,
		Limit: 30,
	})
	if err != nil || response.Error != "" {
		return nil, false
	}
	if response.Hits == nil {
		response.Hits = []searchd.Hit{}
	}
	return response.Hits, true
}

// rerankFiles reorders search hits by semantic (Nomic embedding) similarity to
// the query via the search daemon, then keeps the top-K. The daemon returns only
// paths, so we map back to the original hits to preserve their names and
// snippets. On any failure it falls back to the search order.
func (s *Server) rerankFiles(query string, hits []searchd.Hit, topK int) []searchd.Hit {
	paths := make([]string, len(hits))
	for i, hit := range hits {
		paths[i] = hit.Path
	}
	response, err := searchd.QuerySocket(searchd.SocketPath(), searchd.Request{
		Op:         "rerank",
		Text:       query,
		Candidates: paths,
		Limit:      len(paths),
	})
	if err != nil || response.Error != "" || len(response.Hits) == 0 {
		return capHits(hits, topK)
	}

	byPath := make(map[string]searchd.Hit, len(hits))
	for _, hit := range hits {
		byPath[hit.Path] = hit
	}
	ranked := make([]searchd.Hit, 0, topK)
	for _, rankedHit := range response.Hits {
		original, ok := byPath[rankedHit.Path]
		if !ok {
			continue
		}
		ranked = append(ranked, original)
		if len(ranked) >= topK {
			break
		}
	}
	if len(ranked) == 0 {
		return capHits(hits, topK)
	}
	return ranked
}

func (s *Server) filenameFallback(query string) []searchd.Hit {
	if s.index == nil {
		return []searchd.Hit{}
	}
	entries := s.index.Search(query, 30)
	hits := make([]searchd.Hit, len(entries))
	for i, entry := range entries {
		hits[i] = searchd.Hit{Path: entry.Path, Name: entry.Name, IsDir: entry.IsDir}
	}
	return hits
}
