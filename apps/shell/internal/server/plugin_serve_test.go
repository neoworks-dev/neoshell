package server

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestHandlePluginServesDist(t *testing.T) {
	pluginsDir := t.TempDir()
	distDir := filepath.Join(pluginsDir, "dock", "dist")
	if err := os.MkdirAll(filepath.Join(distDir, "assets"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(distDir, "index.html"), []byte("DOCK-INDEX"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(distDir, "assets", "app.js"), []byte("APP-JS"), 0o644); err != nil {
		t.Fatal(err)
	}

	s := &Server{pluginsDir: pluginsDir}

	// Note: http.FileServer redirects /index.html to ./, so the surface loads
	// /plugins/dock/ (served index.html) directly.
	cases := map[string]string{
		"/plugins/dock/":              "DOCK-INDEX",
		"/plugins/dock/assets/app.js": "APP-JS",
	}
	for path, want := range cases {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		rec := httptest.NewRecorder()
		s.handlePlugin(rec, req)
		if rec.Code != http.StatusOK {
			t.Errorf("%s: status %d, want 200", path, rec.Code)
			continue
		}
		if got := rec.Body.String(); got != want {
			t.Errorf("%s: body %q, want %q", path, got, want)
		}
	}
}

func TestHandlePluginRejectsTraversal(t *testing.T) {
	pluginsDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(pluginsDir, "secret"), []byte("SECRET"), 0o644); err != nil {
		t.Fatal(err)
	}
	s := &Server{pluginsDir: pluginsDir}

	for _, path := range []string{"/plugins/", "/plugins/../secret"} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		rec := httptest.NewRecorder()
		s.handlePlugin(rec, req)
		if rec.Code == http.StatusOK && rec.Body.String() == "SECRET" {
			t.Errorf("%s leaked a file outside a plugin dist", path)
		}
	}
}
