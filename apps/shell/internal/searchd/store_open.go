package searchd

import (
	"context"
	"os"
	"path/filepath"
)

// indexPath resolves the on-disk index file (gob). Override the directory via
// NEOSHELL_SEARCH_DATA.
func indexPath() string {
	if dir := os.Getenv("NEOSHELL_SEARCH_DATA"); dir != "" {
		return filepath.Join(dir, "index.gob")
	}
	base := os.Getenv("XDG_DATA_HOME")
	if base == "" {
		base = filepath.Join(os.Getenv("HOME"), ".local", "share")
	}
	return filepath.Join(base, "neoshell", "search", "index.gob")
}

// OpenStore opens the in-process index (self-contained BM25 + vector, persisted
// to a gob file). No external database.
func OpenStore(_ context.Context) (Store, error) {
	return openLocalStore(indexPath())
}
