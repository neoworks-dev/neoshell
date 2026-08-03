// Package files exposes the shell's file index as capability actions.
//
// The agent backend has its own file tools, but they only reach its workspace.
// These reach the user's whole indexed home through the semantic search daemon,
// which is the thing that makes "find that invoice from March" work at all.
package files

import (
	"os"
	"unicode/utf8"

	"github.com/neoworks/neoshell/internal/searchd"
)

// SearchFunc runs a query against the shell's file index. It is injected rather
// than imported so this package does not depend on the server.
type SearchFunc func(query string) []searchd.Hit

type Service struct {
	search SearchFunc
}

func New(search SearchFunc) *Service {
	return &Service{search: search}
}

// readCapped returns up to max bytes of a UTF-8 text file, or "" for
// directories, unreadable files, and binary content. Truncation is deliberate:
// a handler's result goes straight into the model's context, and one large log
// file would evict everything else in it.
func readCapped(path string, max int) string {
	info, err := os.Stat(path)
	if err != nil || info.IsDir() {
		return ""
	}
	file, err := os.Open(path)
	if err != nil {
		return ""
	}
	defer file.Close()
	buffer := make([]byte, max)
	n, err := file.Read(buffer)
	if err != nil && n == 0 {
		return ""
	}
	content := buffer[:n]
	if !utf8.Valid(content) {
		return ""
	}
	return string(content)
}
