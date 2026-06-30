package server

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
)

// resolveIconPath walks several theme trees per call, so cache results — desktop
// icons are stable for a session and the same names are requested repeatedly.
var (
	iconCacheMu sync.Mutex
	iconCache   = map[string]string{}
)

// resolveIconPath maps a freedesktop icon name (from a .desktop Icon= key) to a
// file on disk, following the active icon theme and falling back through
// Adwaita/breeze/hicolor and the legacy pixmaps dir. size is the preferred pixel
// size; the closest available bucket wins, with SVGs preferred over a far-off
// raster size.
func resolveIconPath(iconName string, size int) string {
	if iconName == "" {
		return ""
	}
	if filepath.IsAbs(iconName) {
		return iconName
	}
	// Some Icon= values carry an extension; strip a known image one so the lookup
	// matches "name" not "name.png".
	for _, ext := range iconExts {
		iconName = strings.TrimSuffix(iconName, ext)
	}

	cacheKey := fmt.Sprintf("%s@%d", iconName, size)
	iconCacheMu.Lock()
	if cached, ok := iconCache[cacheKey]; ok {
		iconCacheMu.Unlock()
		return cached
	}
	iconCacheMu.Unlock()

	resolved := resolveIconUncached(iconName, size)

	iconCacheMu.Lock()
	iconCache[cacheKey] = resolved
	iconCacheMu.Unlock()
	return resolved
}

func resolveIconUncached(iconName string, size int) string {
	best := ""
	bestScore := iconNoMatch
	for _, base := range iconBaseDirs {
		for _, theme := range iconThemeSearchOrder() {
			path, score := scanThemeDir(filepath.Join(base, theme), iconName, size)
			if path == "" || score >= bestScore {
				continue
			}
			best, bestScore = path, score
			if score == 0 {
				return best // exact size match — can't do better
			}
		}
	}
	if best != "" {
		return best
	}

	// Legacy flat pixmaps dir (no theme/size structure).
	for _, ext := range iconExts {
		path := filepath.Join("/usr/share/pixmaps", iconName+ext)
		if fileExists(path) {
			return path
		}
	}
	return ""
}

const iconNoMatch = 1 << 30

var iconBaseDirs = []string{
	os.ExpandEnv("$HOME/.local/share/icons"),
	os.ExpandEnv("$HOME/.icons"),
	"/usr/share/icons",
	"/usr/local/share/icons",
}

var iconExts = []string{".png", ".svg", ".xpm"}

// scanThemeDir finds the best-scoring icon file for name anywhere inside one
// theme directory (e.g. /usr/share/icons/hicolor). It walks the tree so it
// handles both freedesktop layouts — size/category (hicolor) and category/size
// (breeze) — without assuming an order. Returns "" if the theme has no match.
func scanThemeDir(themeDir, name string, want int) (string, int) {
	targets := map[string]bool{}
	for _, ext := range iconExts {
		targets[name+ext] = true
	}

	best := ""
	bestScore := iconNoMatch
	filepath.WalkDir(themeDir, func(path string, d os.DirEntry, err error) error {
		if err != nil || d.IsDir() || !targets[d.Name()] {
			return nil
		}
		score := pathSizeScore(path, want)
		if score < bestScore {
			best, bestScore = path, score
		}
		return nil
	})
	return best, bestScore
}

// pathSizeScore ranks a candidate by how close its size is to want: 0 is an exact
// raster match, larger is worse. The size is read from whichever path segment
// parses as one (e.g. "48x48" or "48"), so it works regardless of layout. SVGs
// score a small constant — they beat a wildly mismatched raster but lose to a
// near-size raster.
func pathSizeScore(path string, want int) int {
	if strings.HasSuffix(path, ".svg") {
		return 8
	}
	size := 0
	for _, segment := range strings.Split(filepath.Dir(path), string(filepath.Separator)) {
		if parsed := parseBucketSize(segment); parsed > 0 {
			size = parsed
		}
	}
	if size == 0 {
		return iconNoMatch - 1 // unknown size raster: last resort
	}
	if size >= want {
		return size - want
	}
	// Upscaling looks worse than downscaling, so penalize undersized icons.
	return (want - size) * 2
}

// parseBucketSize reads the pixel size from a theme size dir like "48x48" or
// "48x48@2". Returns 0 for "scalable"/"symbolic" and anything unparseable.
func parseBucketSize(bucket string) int {
	digits := bucket
	if index := strings.IndexAny(bucket, "x@"); index >= 0 {
		digits = bucket[:index]
	}
	size, err := strconv.Atoi(digits)
	if err != nil {
		return 0
	}
	return size
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

// iconThemeSearchOrder returns the themes to try, most specific first: the user's
// configured icon theme, then common fallbacks, then hicolor (always last). The
// freedesktop spec makes hicolor the universal fallback.
func iconThemeSearchOrder() []string {
	order := []string{}
	seen := map[string]bool{}
	add := func(theme string) {
		theme = strings.TrimSpace(theme)
		if theme == "" || seen[theme] {
			return
		}
		seen[theme] = true
		order = append(order, theme)
	}

	add(userIconTheme())
	add("Adwaita")
	add("breeze")
	add("hicolor")
	return order
}

// userIconTheme resolves the active icon theme from gsettings, then the GTK 3
// settings file, returning "" if neither is available.
func userIconTheme() string {
	if theme := gsettingsIconTheme(); theme != "" {
		return theme
	}
	return gtkSettingsIconTheme()
}

func gsettingsIconTheme() string {
	out, err := exec.Command("gsettings", "get", "org.gnome.desktop.interface", "icon-theme").Output()
	if err != nil {
		return ""
	}
	return strings.Trim(strings.TrimSpace(string(out)), "'\"")
}

func gtkSettingsIconTheme() string {
	path := os.ExpandEnv("$HOME/.config/gtk-3.0/settings.ini")
	file, err := os.Open(path)
	if err != nil {
		return ""
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		value, ok := strings.CutPrefix(line, "gtk-icon-theme-name=")
		if ok {
			return strings.TrimSpace(value)
		}
	}
	return ""
}
