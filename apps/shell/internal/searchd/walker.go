package searchd

import (
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

// shouldSkipDir reports whether a directory base name is noise to ignore during
// indexing — the skipDirs set plus per-user trash dirs like ".Trash-1000".
func shouldSkipDir(name string) bool {
	if skipDirs[name] {
		return true
	}
	return strings.HasPrefix(name, ".Trash-")
}

// skipDirs are pruned during the walk and ignored by the watcher: large,
// regenerable, or uninteresting trees that would bloat the index and waste
// embedding time. Matched by directory base name.
var skipDirs = map[string]bool{
	// Version control
	".git": true, ".svn": true, ".hg": true, ".bzr": true,
	// JS/TS dependencies & build output
	"node_modules": true, "bower_components": true, ".pnpm-store": true,
	".yarn": true, ".next": true, ".nuxt": true, ".svelte-kit": true,
	".turbo": true, ".nx": true, ".parcel-cache": true, ".angular": true,
	// Generic build/output
	"dist": true, "build": true, "out": true, "bin": true, "obj": true,
	"target": true, "vendor": true,
	// Caches
	".cache": true, ".ccache": true, ".npm": true, ".gradle": true,
	".m2": true, ".nuget": true, ".gem": true, ".bundle": true,
	".pub-cache": true, ".cargo": true, ".rustup": true, ".stack": true,
	".ollama": true,
	// Python
	".venv": true, "venv": true, "__pycache__": true, ".pytest_cache": true,
	".mypy_cache": true, ".ruff_cache": true, ".tox": true, ".eggs": true,
	".ipynb_checkpoints": true,
	// iOS/macOS/Java build
	"Pods": true, "DerivedData": true,
	// Infra
	".terraform": true, ".serverless": true,
	// Coverage/test
	"coverage": true, ".nyc_output": true,
	// Editors / IDE
	".idea": true, ".vscode": true, ".vs": true,
	// Sandboxes / large app data
	".var": true, "snap": true, ".wine": true, ".mozilla": true,
	".steam": true,
	// Games & their generated content — huge, binary, never worth searching.
	"steamapps": true, "Steam": true, "SteamLibrary": true,
	"compatdata": true, "shadercache": true,
	"steamworks_common_redistributables": true,
	"Games": true, "lutris": true, "Heroic": true, "PrismLauncher": true,
	// Generated caches from Chromium/Electron-style apps.
	"GPUCache": true, "Code Cache": true, "CachedData": true,
	"Crashpad": true, "ShaderCache": true,
	// Trash / OS
	".Trash": true, "$RECYCLE.BIN": true, "System Volume Information": true,
	// The user's Go workspace (built packages, module cache)
	"go": true,
}

// highPriorityDirs are the home subdirectories whose files matter most in search
// results — documents, downloads, and media the user actually reaches for.
var highPriorityDirs = map[string]bool{
	"Documents": true, "Desktop": true, "Downloads": true,
	"Pictures": true, "Notes": true, "Projects": true,
	"Code": true, "dev": true, "src": true, "Work": true,
}

var (
	homeOnce sync.Once
	homeDir  string
)

func userHome() string {
	homeOnce.Do(func() {
		if home, err := os.UserHomeDir(); err == nil {
			homeDir = home
		}
	})
	return homeDir
}

// PathPriority scores a path's importance for result ranking, returned as a score
// multiplier applied during fusion (1.0 is neutral). Files in the user's
// document-like folders rank above buried app-data/dotfile paths.
func PathPriority(path string) float64 {
	home := userHome()
	if home == "" {
		return 1.0
	}
	relative, err := filepath.Rel(home, path)
	if err != nil || strings.HasPrefix(relative, "..") {
		return 1.0 // outside the home directory
	}
	top := relative
	if index := strings.IndexByte(relative, filepath.Separator); index >= 0 {
		top = relative[:index]
	}
	if highPriorityDirs[top] {
		return 1.6
	}
	if strings.HasPrefix(top, ".") {
		return 0.6 // dotfiles / buried app data
	}
	return 1.0
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
			if shouldSkipDir(entry.Name()) {
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
				if shouldSkipDir(entry.Name()) {
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
