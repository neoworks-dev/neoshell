package server

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParseBucketSize(t *testing.T) {
	cases := map[string]int{
		"48x48":    48, // hicolor size dir
		"48x48@2":  48, // scaled variant
		"256x256":  256,
		"48":       48, // breeze size dir
		"scalable": 0,
		"symbolic": 0,
		"apps":     0,
	}
	for input, want := range cases {
		if got := parseBucketSize(input); got != want {
			t.Errorf("parseBucketSize(%q) = %d, want %d", input, got, want)
		}
	}
}

func TestPathSizeScore(t *testing.T) {
	// SVG beats a far-off raster but loses to a near-size raster.
	svg := pathSizeScore("/usr/share/icons/hicolor/scalable/apps/foo.svg", 64)
	exact := pathSizeScore("/usr/share/icons/hicolor/64x64/apps/foo.png", 64)
	far := pathSizeScore("/usr/share/icons/hicolor/512x512/apps/foo.png", 64)
	near := pathSizeScore("/usr/share/icons/breeze/apps/48/foo.png", 64) // breeze layout

	if exact != 0 {
		t.Errorf("exact raster score = %d, want 0", exact)
	}
	// Exact raster wins; a scalable SVG beats any mismatched raster; among rasters,
	// a near size beats a far one.
	if !(exact < svg && svg < near && near < far) {
		t.Errorf("score order wrong: exact=%d svg=%d near=%d far=%d", exact, svg, near, far)
	}
}

func TestResolveIconPathAbsolute(t *testing.T) {
	abs := "/opt/app/icon.png"
	if got := resolveIconPath(abs, 64); got != abs {
		t.Errorf("absolute path = %q, want %q", got, abs)
	}
}

// Smoke test against the real icon themes when available: a resolved path must
// exist and carry a known extension. Skips on hosts without the sample icon.
func TestResolveIconPathSmoke(t *testing.T) {
	for _, name := range []string{"firefox", "kitty", "org.gnome.Nautilus", "utilities-terminal"} {
		path := resolveIconPath(name, 64)
		if path == "" {
			continue
		}
		if !fileExists(path) {
			t.Errorf("resolved %q to %q which does not exist", name, path)
		}
		switch filepath.Ext(path) {
		case ".png", ".svg", ".xpm":
		default:
			t.Errorf("resolved %q to non-image %q", name, path)
		}
		return
	}
	if _, err := os.Stat("/usr/share/icons"); err == nil {
		t.Skip("no sample icons installed")
	}
}
