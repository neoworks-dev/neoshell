// Package apps reads freedesktop .desktop application entries so the shell can
// show real application icons and launch real commands (desktop icons, and later
// an app launcher/picker).
package apps

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"syscall"
)

// Launch starts a command detached from the shell, in its own session, so the
// compositor maps the new window and the app outlives the launcher. Runs through
// `sh -c` so cleaned .desktop Exec lines (which may set env, e.g. `env A=b app`)
// work. Hyprland 0.55 moved its dispatch IPC to a Lua API; spawning directly is
// version-proof and is all an app launcher needs.
func Launch(command string) error {
	if strings.TrimSpace(command) == "" {
		return fmt.Errorf("empty launch command")
	}
	cmd := exec.Command("sh", "-c", command)
	cmd.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
	if err := cmd.Start(); err != nil {
		return err
	}
	go cmd.Wait() // reap when the app eventually exits
	return nil
}

// App is a launchable application parsed from a .desktop entry.
type App struct {
	ID         string   `json:"id"`         // .desktop basename without the extension
	Name       string   `json:"name"`       // display name
	Exec       string   `json:"exec"`       // command with field codes (%U, %f, …) removed
	Icon       string   `json:"icon"`       // freedesktop icon name or absolute path
	Categories []string `json:"categories"` // freedesktop main categories
}

// searchDirs are the XDG application directories, user first so a user override
// wins over a system entry of the same id.
func searchDirs() []string {
	dirs := []string{
		os.ExpandEnv("$HOME/.local/share/applications"),
		"/usr/local/share/applications",
		"/usr/share/applications",
	}
	if xdg := os.Getenv("XDG_DATA_DIRS"); xdg != "" {
		for _, base := range strings.Split(xdg, ":") {
			if base == "" {
				continue
			}
			dirs = append(dirs, filepath.Join(base, "applications"))
		}
	}
	return dirs
}

// List returns the visible applications, de-duplicated by id (first seen wins)
// and sorted by name.
func List() []App {
	seen := map[string]bool{}
	var result []App
	for _, dir := range searchDirs() {
		entries, err := os.ReadDir(dir)
		if err != nil {
			continue
		}
		for _, entry := range entries {
			if !strings.HasSuffix(entry.Name(), ".desktop") {
				continue
			}
			id := strings.TrimSuffix(entry.Name(), ".desktop")
			if seen[id] {
				continue
			}
			app, ok := parse(filepath.Join(dir, entry.Name()), id)
			if !ok {
				continue
			}
			seen[id] = true
			result = append(result, app)
		}
	}
	sort.Slice(result, func(i, j int) bool {
		return strings.ToLower(result[i].Name) < strings.ToLower(result[j].Name)
	})
	return result
}

// parse reads the [Desktop Entry] group, returning ok=false for entries that
// should not be shown or launched (non-applications, NoDisplay, Hidden).
func parse(path, id string) (App, bool) {
	data, err := os.ReadFile(path)
	if err != nil {
		return App{}, false
	}

	app := App{ID: id}
	inEntry := false
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "[") {
			inEntry = line == "[Desktop Entry]"
			continue
		}
		if !inEntry {
			continue
		}
		key, value, found := strings.Cut(line, "=")
		if !found {
			continue
		}
		switch key {
		case "Type":
			if value != "Application" {
				return App{}, false
			}
		case "NoDisplay", "Hidden":
			if strings.EqualFold(value, "true") {
				return App{}, false
			}
		case "Name":
			if app.Name == "" {
				app.Name = value
			}
		case "Exec":
			app.Exec = cleanExec(value)
		case "Icon":
			app.Icon = value
		case "Categories":
			app.Categories = splitList(value)
		}
	}

	if app.Name == "" || app.Exec == "" {
		return App{}, false
	}
	return app, true
}

// cleanExec drops the field codes (%U, %f, %i, …) the freedesktop spec allows in
// Exec, leaving a command suitable for `hyprctl dispatch exec`.
func cleanExec(exec string) string {
	fields := strings.Fields(exec)
	kept := make([]string, 0, len(fields))
	for _, field := range fields {
		if len(field) == 2 && field[0] == '%' {
			continue
		}
		kept = append(kept, field)
	}
	return strings.Join(kept, " ")
}

func splitList(value string) []string {
	var out []string
	for _, part := range strings.Split(value, ";") {
		if part != "" {
			out = append(out, part)
		}
	}
	return out
}

// hasCategory reports whether the app declares the given freedesktop category.
func (a App) hasCategory(category string) bool {
	for _, c := range a.Categories {
		if c == category {
			return true
		}
	}
	return false
}

// seedCategories is the priority order for picking sensible default desktop
// apps: one representative per category, common desktop tools first.
var seedCategories = []string{
	"TerminalEmulator",
	"WebBrowser",
	"FileManager",
	"TextEditor",
	"Settings",
	"AudioVideo",
}

// DefaultSelection picks a small, sensible set of installed apps to seed an empty
// desktop — one representative per common category (terminal, browser, files, …).
// Only real category matches are used, so the seed never falls back to arbitrary
// alphabetical entries; an empty system simply yields fewer icons.
func DefaultSelection(limit int) []App {
	all := List()
	var chosen []App
	picked := map[string]bool{}

	for _, category := range seedCategories {
		if len(chosen) >= limit {
			break
		}
		for _, app := range all {
			if picked[app.ID] || !app.hasCategory(category) {
				continue
			}
			picked[app.ID] = true
			chosen = append(chosen, app)
			break
		}
	}
	return chosen
}
