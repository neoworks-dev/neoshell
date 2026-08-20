// Package plugins loads shell surface plugins from a plugins directory. Each
// plugin is a directory containing a manifest.json that declares one or more
// layer-shell surfaces. The Go core reads these manifests to decide which
// surfaces to create and how to configure them, replacing the previously
// hardcoded set of shell surfaces (bar, desktop, dock).
//
// The manifest is the shared contract between the Go core (which creates the
// surfaces) and the frontend plugin (which owns the surface's UI): the same
// file is read by the plugin's own build to self-register its surface classes.
package plugins

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
)

// Manifest describes a single plugin: an id and the surfaces it contributes.
type Manifest struct {
	ID string `json:"id"`
	// Enabled defaults to true when omitted, so a manifest present on disk is
	// active unless it opts out or config disables it.
	Enabled  *bool     `json:"enabled,omitempty"`
	Surfaces []Surface `json:"surfaces"`
}

// Surface describes one layer-shell surface a plugin contributes. Field names
// mirror renderhost.SurfaceSpec; the controller translates them into the
// render-host control protocol.
type Surface struct {
	// View is the surface role and the frontend view selector (?view=<view>).
	View     string   `json:"view"`
	Layer    string   `json:"layer"`
	Anchors  []string `json:"anchors"`
	Keyboard string   `json:"keyboard"`
	// Toggleable marks a surface that window:toggle maps/unmaps rather than one
	// that stays mapped for its lifetime (e.g. bar).
	Toggleable bool `json:"toggleable,omitempty"`
	// StartHidden hides the surface immediately after creation, for toggleable
	// surfaces that should not be visible until first opened.
	StartHidden bool `json:"startHidden,omitempty"`
	// ExclusiveEdge/ExclusiveSize reserve screen space (a static exclusive zone).
	// Most surfaces reserve dynamically via window:exclusive instead.
	ExclusiveEdge string `json:"exclusiveEdge,omitempty"`
	ExclusiveSize int    `json:"exclusiveSize,omitempty"`
	// Blur requests a compositor blur layerrule for this surface's namespace.
	Blur bool `json:"blur,omitempty"`
	// Classes are the surface:toggle class names the frontend registers. The Go
	// core does not use them; they are documented here as part of the contract.
	Classes []string `json:"classes,omitempty"`
}

// enabled reports whether a manifest is active (Enabled defaults to true).
func (m Manifest) enabled() bool {
	return m.Enabled == nil || *m.Enabled
}

// Load reads every <dir>/*/manifest.json, returns the enabled manifests sorted
// by id for deterministic surface-creation order. A missing directory yields no
// manifests and no error, so the caller can fall back to built-in defaults.
func Load(dir string) ([]Manifest, error) {
	if dir == "" {
		return nil, nil
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("read plugins dir %q: %w", dir, err)
	}

	var manifests []Manifest
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		manifest, ok, err := loadManifest(filepath.Join(dir, entry.Name()))
		if err != nil {
			return nil, err
		}
		if ok && manifest.enabled() {
			manifests = append(manifests, manifest)
		}
	}

	sort.Slice(manifests, func(i, j int) bool {
		return manifests[i].ID < manifests[j].ID
	})
	return manifests, nil
}

// loadManifest reads one plugin directory's manifest.json. The bool is false
// when the directory has no manifest (not an error — it may be a build dir).
func loadManifest(pluginDir string) (Manifest, bool, error) {
	path := filepath.Join(pluginDir, "manifest.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return Manifest{}, false, nil
		}
		return Manifest{}, false, fmt.Errorf("read manifest %q: %w", path, err)
	}

	var manifest Manifest
	if err := json.Unmarshal(raw, &manifest); err != nil {
		return Manifest{}, false, fmt.Errorf("parse manifest %q: %w", path, err)
	}
	if manifest.ID == "" {
		return Manifest{}, false, fmt.Errorf("manifest %q: missing id", path)
	}
	return manifest, true, nil
}

// ResolvedSurface is a surface flattened out of its manifest, tagged with its
// plugin id. The controller loads each surface from its plugin page
// (/plugins/<id>/), served by the Go core (prod) or the dev-Vite aggregator.
type ResolvedSurface struct {
	Surface
	PluginID string
}

// Resolve flattens the enabled manifests into their surfaces, tagging each with
// its plugin id.
func Resolve(manifests []Manifest) []ResolvedSurface {
	var resolved []ResolvedSurface
	for _, manifest := range manifests {
		for _, surface := range manifest.Surfaces {
			resolved = append(resolved, ResolvedSurface{
				Surface:  surface,
				PluginID: manifest.ID,
			})
		}
	}
	return resolved
}
