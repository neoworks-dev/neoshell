package searchd

import (
	"io/fs"
	"os"
	"path/filepath"
)

// skipDirs are pruned during the walk and ignored by the watcher: large,
// regenerable, or uninteresting trees that would bloat the index. Mirrors
// internal/fileindex's list.
var skipDirs = map[string]bool{
	"node_modules": true, ".git": true, ".cache": true, ".npm": true,
	".cargo": true, "target": true, ".venv": true, "__pycache__": true,
	".next": true, "dist": true, "build": true, ".gradle": true,
	".Trash": true, ".mozilla": true, "go": true,
}

// DefaultRoots returns the roots to index: the user's home directory.
func DefaultRoots() []string {
	home, err := os.UserHomeDir()
	if err != nil || home == "" {
		return nil
	}
	return []string{home}
}

// walkDirs visits every non-skipped directory under each root, calling fn. Used
// by the watcher to register a watch per directory (fsnotify is not recursive).
func walkDirs(roots []string, fn func(dir string)) {
	for _, root := range roots {
		filepath.WalkDir(root, func(path string, entry fs.DirEntry, err error) error {
			if err != nil || !entry.IsDir() {
				return nil
			}
			if skipDirs[entry.Name()] {
				return filepath.SkipDir
			}
			fn(path)
			return nil
		})
	}
}

// walkFiles visits every non-skipped regular file under each root, calling fn.
// Directory errors are skipped rather than aborting the whole walk.
func walkFiles(roots []string, fn func(path string, info fs.FileInfo)) {
	for _, root := range roots {
		filepath.WalkDir(root, func(path string, entry fs.DirEntry, err error) error {
			if err != nil {
				return nil
			}
			if entry.IsDir() {
				if skipDirs[entry.Name()] {
					return filepath.SkipDir
				}
				return nil
			}
			info, err := entry.Info()
			if err != nil {
				return nil
			}
			fn(path, info)
			return nil
		})
	}
}
