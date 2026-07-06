package plugins

import (
	"os"
	"path/filepath"
	"testing"
)

func writeManifest(t *testing.T, dir, id, body string) {
	t.Helper()
	pluginDir := filepath.Join(dir, id)
	if err := os.MkdirAll(pluginDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(pluginDir, "manifest.json"), []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
}

func TestLoadReadsEnabledManifestsSortedByID(t *testing.T) {
	dir := t.TempDir()
	writeManifest(t, dir, "spotlight", `{"id":"spotlight","surfaces":[{"view":"spotlight","layer":"overlay","anchors":["top","left"],"keyboard":"ondemand","toggleable":true}]}`)
	writeManifest(t, dir, "bar", `{"id":"bar","surfaces":[{"view":"bar","layer":"top","anchors":["top"],"keyboard":"none","blur":true}]}`)
	writeManifest(t, dir, "disabled", `{"id":"disabled","enabled":false,"surfaces":[{"view":"x","layer":"top"}]}`)

	manifests, err := Load(dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(manifests) != 2 {
		t.Fatalf("want 2 enabled manifests, got %d", len(manifests))
	}
	if manifests[0].ID != "bar" || manifests[1].ID != "spotlight" {
		t.Fatalf("want [bar spotlight] sorted, got [%s %s]", manifests[0].ID, manifests[1].ID)
	}

	surfaces := Resolve(manifests)
	if len(surfaces) != 2 {
		t.Fatalf("want 2 surfaces, got %d", len(surfaces))
	}
	if !surfaces[0].Blur {
		t.Errorf("bar surface should request blur")
	}
	if surfaces[0].PluginID != "bar" {
		t.Errorf("want PluginID bar, got %q", surfaces[0].PluginID)
	}
	if !surfaces[1].Toggleable {
		t.Errorf("spotlight surface should be toggleable")
	}
}

func TestResolveTagsPluginID(t *testing.T) {
	dir := t.TempDir()
	writeManifest(t, dir, "dock", `{"id":"dock","surfaces":[{"view":"dock","layer":"top","anchors":["bottom"],"keyboard":"none"}]}`)

	manifests, err := Load(dir)
	if err != nil {
		t.Fatal(err)
	}
	surfaces := Resolve(manifests)
	if len(surfaces) != 1 || surfaces[0].PluginID != "dock" || surfaces[0].View != "dock" {
		t.Fatalf("want one dock surface tagged with its plugin id, got %+v", surfaces)
	}
}

func TestLoadMissingDirReturnsNothing(t *testing.T) {
	manifests, err := Load(filepath.Join(t.TempDir(), "does-not-exist"))
	if err != nil {
		t.Fatalf("missing dir should not error, got %v", err)
	}
	if manifests != nil {
		t.Fatalf("want no manifests, got %v", manifests)
	}
}

func TestLoadEmptyPathReturnsNothing(t *testing.T) {
	manifests, err := Load("")
	if err != nil || manifests != nil {
		t.Fatalf("empty path should yield (nil, nil), got (%v, %v)", manifests, err)
	}
}

func TestLoadRejectsManifestWithoutID(t *testing.T) {
	dir := t.TempDir()
	writeManifest(t, dir, "broken", `{"surfaces":[]}`)
	if _, err := Load(dir); err == nil {
		t.Fatal("manifest without id should error")
	}
}

func TestLoadIgnoresDirWithoutManifest(t *testing.T) {
	dir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(dir, "just-a-build-dir"), 0o755); err != nil {
		t.Fatal(err)
	}
	manifests, err := Load(dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(manifests) != 0 {
		t.Fatalf("want 0 manifests, got %d", len(manifests))
	}
}
