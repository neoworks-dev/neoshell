// Package fileindex builds an in-memory index of the user's files so the apps
// overlay can answer fuzzy filename queries fast. The walk runs once at startup
// in a goroutine (so it never blocks boot) and prunes noisy build/cache dirs.
package fileindex

import (
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
)

// Entry is one indexed filesystem path.
type Entry struct {
	Name  string `json:"name"`
	Path  string `json:"path"`
	IsDir bool   `json:"isDir"`
}

// skipDirs are directory names pruned during the walk: large, regenerable, or
// uninteresting trees that would bloat the index and slow every query.
var skipDirs = map[string]bool{
	"node_modules": true,
	".git":         true,
	".cache":       true,
	".npm":         true,
	".cargo":       true,
	"target":       true,
	".venv":        true,
	"__pycache__":  true,
	".next":        true,
	"dist":         true,
	"build":        true,
	".gradle":      true,
	".Trash":       true,
	".mozilla":     true,
	// Games & their generated content — never worth searching.
	".steam":       true,
	"steamapps":    true,
	"Steam":        true,
	"SteamLibrary": true,
	"compatdata":   true,
	"shadercache":  true,
	"Games":        true,
	"lutris":       true,
	"Heroic":       true,
	"curseforge":   true,
	"minecraft":    true,
	".minecraft":   true,
}

// Index holds the indexed entries behind an RWMutex so Build can swap the slice
// while Search reads concurrently.
type Index struct {
	mu      sync.RWMutex
	entries []Entry
	ready   bool
}

func New() *Index {
	return &Index{}
}

// documentRoots are the home subdirectories worth indexing: the user's own
// documents and media. Indexing all of $HOME drags in hundreds of thousands of
// generated app-data/cache files that are never worth searching.
var documentRoots = []string{"Documents", "Downloads", "Desktop", "Pictures"}

// DefaultRoots returns the roots to index — the user's document and media folders
// that actually exist.
func DefaultRoots() []string {
	home, err := os.UserHomeDir()
	if err != nil || home == "" {
		return nil
	}
	var roots []string
	for _, name := range documentRoots {
		path := filepath.Join(home, name)
		if info, err := os.Stat(path); err == nil && info.IsDir() {
			roots = append(roots, path)
		}
	}
	return roots
}

// Build walks the given roots and atomically replaces the index. Safe to run in
// a goroutine; unreadable directories are skipped rather than aborting the walk.
func (i *Index) Build(roots []string) {
	var collected []Entry
	for _, root := range roots {
		walkRoot(root, &collected)
	}
	i.mu.Lock()
	i.entries = collected
	i.ready = true
	i.mu.Unlock()
}

func walkRoot(root string, collected *[]Entry) {
	filepath.WalkDir(root, func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			// Unreadable dir: prune it; unreadable file: just skip it.
			if entry != nil && entry.IsDir() {
				return fs.SkipDir
			}
			return nil
		}
		if entry.IsDir() {
			return visitDir(root, path, entry, collected)
		}
		*collected = append(*collected, Entry{Name: entry.Name(), Path: path})
		return nil
	})
}

func visitDir(root, path string, entry fs.DirEntry, collected *[]Entry) error {
	if path == root {
		return nil
	}
	if skipDirs[entry.Name()] {
		return fs.SkipDir
	}
	*collected = append(*collected, Entry{Name: entry.Name(), Path: path, IsDir: true})
	return nil
}

// Search returns up to limit entries whose name fuzzy-matches the query, best
// first. Ranking: exact > prefix > word-boundary > substring > subsequence,
// tie-broken by shorter path.
func (i *Index) Search(query string, limit int) []Entry {
	query = strings.ToLower(strings.TrimSpace(query))
	if query == "" {
		return nil
	}

	i.mu.RLock()
	entries := i.entries
	i.mu.RUnlock()

	type scored struct {
		entry Entry
		rank  int
	}
	var matches []scored
	for _, entry := range entries {
		rank := score(strings.ToLower(entry.Name), query)
		if rank < 0 {
			continue
		}
		matches = append(matches, scored{entry: entry, rank: rank})
	}

	sort.Slice(matches, func(a, b int) bool {
		if matches[a].rank != matches[b].rank {
			return matches[a].rank < matches[b].rank
		}
		return len(matches[a].entry.Path) < len(matches[b].entry.Path)
	})

	if len(matches) > limit {
		matches = matches[:limit]
	}
	result := make([]Entry, len(matches))
	for index, match := range matches {
		result[index] = match.entry
	}
	return result
}

// score rates how well name matches query; lower is better, -1 means no match.
func score(name, query string) int {
	if name == query {
		return 0
	}
	index := strings.Index(name, query)
	if index == 0 {
		return 1
	}
	if index > 0 {
		if isWordBoundary(name[index-1]) {
			return 2
		}
		return 3
	}
	if isSubsequence(query, name) {
		return 4
	}
	return -1
}

func isWordBoundary(b byte) bool {
	return b == ' ' || b == '-' || b == '_' || b == '.'
}

// isSubsequence reports whether every character of query appears in name in
// order (not necessarily contiguous).
func isSubsequence(query, name string) bool {
	position := 0
	for charIndex := 0; charIndex < len(name) && position < len(query); charIndex++ {
		if name[charIndex] == query[position] {
			position++
		}
	}
	return position == len(query)
}
