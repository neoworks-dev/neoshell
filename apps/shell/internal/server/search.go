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
