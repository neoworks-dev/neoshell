package main

import (
	"fmt"
	"net/http"
	"os"

	"github.com/neoworks/neoshell/internal/config"
)

// overlayKeybind returns the optional Hyprland combo the core should bind to the
// overlay (e.g. "SUPER,slash"), or "" to inject nothing.
func overlayKeybind(cfg *config.Store) string {
	value, _ := cfg.Get("bar.overlayKeybind")
	combo, _ := value.(string)
	return combo
}

// controlActions are the surface commands the CLI can send to a running core, so
// a Hyprland keybind can run e.g. `neoshell toggle overlay` instead of curl.
var controlActions = map[string]bool{"toggle": true, "open": true, "close": true}

// runControl posts a surface action to the running core's /toggle endpoint and
// exits. surface defaults to "overlay".
func runControl(action string, args []string) {
	surface := "overlay"
	if len(args) > 0 && args[0] != "" {
		surface = args[0]
	}
	url := fmt.Sprintf("http://localhost:%d/toggle?surface=%s&action=%s", envPort(), surface, action)
	resp, err := http.Post(url, "", nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "neoshell %s %s: %v (is the shell running?)\n", action, surface, err)
		os.Exit(1)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		fmt.Fprintf(os.Stderr, "neoshell %s %s: HTTP %d\n", action, surface, resp.StatusCode)
		os.Exit(1)
	}
}
