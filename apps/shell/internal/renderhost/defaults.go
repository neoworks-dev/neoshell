package renderhost

import "github.com/neoworks/neoshell/internal/plugins"

// defaultSurfaces returns the built-in shell surfaces used when no plugin
// manifests are found. They mirror the previously hardcoded bar, desktop, dock,
// and spotlight surfaces so behavior is unchanged without a plugins directory.
// All load from the monolith (HasDist false) via ?view=.
func defaultSurfaces() []plugins.ResolvedSurface {
	surfaces := []plugins.Surface{
		// Top, not Overlay: a fullscreen window covers the Top layer but draws
		// under an Overlay surface, so Top hides the bar over fullscreen apps.
		// Top+left+right (not all four edges): wlroots ignores the exclusive zone
		// of a surface anchored to all four edges, so the frontend's
		// window:exclusive reservation would do nothing. Dropping the bottom
		// anchor still spans the screen while letting the top exclusive zone work.
		{
			View:     "bar",
			Layer:    "top",
			Anchors:  []string{"top", "left", "right"},
			Keyboard: "ondemand",
			Blur:     true,
		},
		// Fullscreen desktop above the wallpaper, below windows. On-demand keyboard
		// so editable widgets (e.g. sticky notes) can take focus.
		{
			View:     "desktop",
			Layer:    "bottom",
			Anchors:  []string{"top", "bottom", "left", "right"},
			Keyboard: "ondemand",
		},
		// Bottom dock strip on the Top layer; click-through except over the dock,
		// which the frontend defines via its interactive region.
		{
			View:     "dock",
			Layer:    "top",
			Anchors:  []string{"bottom", "left", "right"},
			Keyboard: "none",
			Blur:     true,
		},
		// Fullscreen apps spotlight on the Overlay layer (above all windows).
		// Toggleable: window:toggle maps/unmaps it.
		{
			View:       "spotlight",
			Layer:      "overlay",
			Anchors:    []string{"top", "bottom", "left", "right"},
			Keyboard:   "ondemand",
			Toggleable: true,
			Classes:    []string{"spotlight"},
		},
	}

	resolved := make([]plugins.ResolvedSurface, len(surfaces))
	for i, surface := range surfaces {
		resolved[i] = plugins.ResolvedSurface{Surface: surface, PluginID: surface.View}
	}
	return resolved
}
