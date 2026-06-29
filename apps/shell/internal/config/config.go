// Package config is neoshell's settings store — the shell's equivalent of
// dconf/gsettings. It holds a nested key/value tree, persists it as JSON under
// ~/.config/neoshell/config.json, and notifies a listener on every change so the
// bar and other shell surfaces react live.
package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"

	"github.com/neoworks/neoshell/internal/apps"
)

// Store is the authoritative settings tree. Safe for concurrent use.
type Store struct {
	mu       sync.RWMutex
	path     string
	data     map[string]any
	onChange func(snapshot map[string]any)
}

// Defaults is the full settings schema with its default values. Loading merges
// the on-disk file over this, so new keys always appear with a sane default.
func Defaults() map[string]any {
	return map[string]any{
		"appearance": map[string]any{
			"wallpaper": "",
			"accent":    "#a78bfa",
			// Shared surface background for the bar and every shell window.
			//   translucent — tint + blur ("menu bar background on")
			//   transparent — none, content on the wallpaper ("off"); bar only
			//   solid       — opaque ("reduce transparency on")
			"background": map[string]any{
				"mode":  "translucent",
				"alpha": 0.42,
				"blur":  8,
			},
		},
		"bar": map[string]any{
			"height":  36,
			"monitor": "",
			"modules": map[string]any{
				"workspaces":  true,
				"windowTitle": true,
				"wifi":        true,
				"bluetooth":   true,
				"sound":       true,
				"battery":     true,
				"clock":       true,
				"launcher":    true,
			},
			// Clock representation. timeZone "" = system local; an IANA name
			// (e.g. "Europe/Berlin") overrides it.
			"clock": map[string]any{
				"hour12":      false,
				"seconds":     false,
				"showDate":    true,
				"showWeekday": true,
				"timeZone":    "",
			},
		},
		// Desktop icons. Positions are top-left px on the desktop surface, aligned
		// to an 8px virtual grid. Seeded from installed .desktop apps on first run
		// (see seedDesktopIcons); the frontend persists the whole `icons` array on
		// drop.
		"desktop": map[string]any{
			"grid": 8,
		},
		// Dock (macOS-style bottom bar). `apps` is the pinned app list, seeded from
		// installed .desktop entries on first run (see seedDock); the frontend shows
		// a running dot and focuses or launches on click.
		"dock": map[string]any{
			"iconSize": 30,
			"gap":      10,
			"autoHide": true,
		},
	}
}

// Load reads the config file (creating it from defaults when absent) and returns
// a ready Store. Unknown/missing keys are reconciled against Defaults.
func Load() (*Store, error) {
	path, err := defaultPath()
	if err != nil {
		return nil, err
	}

	migrateLegacyConfig(path)

	data := Defaults()
	if raw, err := os.ReadFile(path); err == nil {
		var onDisk map[string]any
		if err := json.Unmarshal(raw, &onDisk); err == nil {
			mergeInto(data, onDisk)
		}
	}

	seedDesktopIcons(data)
	seedDock(data)
	seedWallpaper(data)

	store := &Store{path: path, data: data}
	// Persist once so the file exists and gains any newly added default keys.
	if err := store.persist(); err != nil {
		return nil, err
	}
	return store, nil
}

// OnChange registers the listener invoked (with a fresh snapshot) after every Set.
func (s *Store) OnChange(fn func(snapshot map[string]any)) {
	s.mu.Lock()
	s.onChange = fn
	s.mu.Unlock()
}

// Snapshot returns a deep copy of the whole tree, safe to hand to other goroutines.
func (s *Store) Snapshot() map[string]any {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return deepCopy(s.data)
}

// Get resolves a dotted key (e.g. "appearance.accent").
func (s *Store) Get(key string) (any, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return lookup(s.data, strings.Split(key, "."))
}

// Set writes value at a dotted key, persists, and notifies the listener. Parent
// maps are created as needed.
func (s *Store) Set(key string, value any) error {
	if key == "" {
		return fmt.Errorf("empty config key")
	}

	s.mu.Lock()
	if err := assign(s.data, strings.Split(key, "."), value); err != nil {
		s.mu.Unlock()
		return err
	}
	if err := s.persist(); err != nil {
		s.mu.Unlock()
		return err
	}
	snapshot := deepCopy(s.data)
	listener := s.onChange
	s.mu.Unlock()

	if listener != nil {
		listener(snapshot)
	}
	return nil
}

// persist writes the tree atomically. Caller holds the lock.
func (s *Store) persist() error {
	if err := os.MkdirAll(filepath.Dir(s.path), 0o755); err != nil {
		return fmt.Errorf("create config dir: %w", err)
	}
	raw, err := json.MarshalIndent(s.data, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal config: %w", err)
	}
	tmp := s.path + ".tmp"
	if err := os.WriteFile(tmp, raw, 0o644); err != nil {
		return fmt.Errorf("write config: %w", err)
	}
	return os.Rename(tmp, s.path)
}

func defaultPath() (string, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("resolve config dir: %w", err)
	}
	return filepath.Join(dir, "neoshell", "config.json"), nil
}

// migrateLegacyConfig copies a pre-rename ~/.config/neobar/config.json into the
// neoshell location on first run, so the rename does not orphan user settings.
// Best-effort: any failure leaves the new path absent and defaults apply.
func migrateLegacyConfig(newPath string) {
	if _, err := os.Stat(newPath); err == nil {
		return // already migrated or freshly created
	}
	dir, err := os.UserConfigDir()
	if err != nil {
		return
	}
	legacy := filepath.Join(dir, "neobar", "config.json")
	raw, err := os.ReadFile(legacy)
	if err != nil {
		return
	}
	if err := os.MkdirAll(filepath.Dir(newPath), 0o755); err != nil {
		return
	}
	os.WriteFile(newPath, raw, 0o644)
}

// legacyIconNames are the placeholder icon names the first desktop version
// shipped before icons were backed by real .desktop entries. Their presence
// signals a stale set that should be reseeded.
var legacyIconNames = map[string]bool{"terminal": true, "folder": true, "globe": true, "gear": true}

// seedDesktopIcons fills desktop.icons from installed applications when it is
// absent or still holds the placeholder set, so the desktop shows real,
// launchable apps with real icons. A user-arranged set is left untouched.
func seedDesktopIcons(data map[string]any) {
	desktop, ok := data["desktop"].(map[string]any)
	if !ok {
		desktop = map[string]any{"grid": 8}
		data["desktop"] = desktop
	}
	if _, ok := desktop["snap"]; !ok {
		desktop["snap"] = true
	}

	// Seed one example clock widget to the right of the icon column on first run.
	if _, ok := desktop["widgets"]; !ok {
		desktop["widgets"] = []any{
			map[string]any{"id": "clock", "type": "clock", "x": 200, "y": 16, "w": 260, "h": 120},
		}
	}

	existing, _ := desktop["icons"].([]any)
	if !desktopIconsNeedSeed(existing) {
		return
	}
	desktop["icons"] = buildDesktopIcons(apps.DefaultSelection(6))
}

// desktopIconsNeedSeed reports whether the stored icons are missing or are the
// shipped placeholder set (identified by their legacy icon names).
func desktopIconsNeedSeed(icons []any) bool {
	if len(icons) == 0 {
		return true
	}
	for _, raw := range icons {
		icon, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		if name, ok := icon["icon"].(string); ok && legacyIconNames[name] {
			return true
		}
	}
	return false
}

// seedDock fills dock.apps from installed applications when absent, so the dock
// shows real, launchable apps on first run. A user-arranged list is left as is.
func seedDock(data map[string]any) {
	dock, ok := data["dock"].(map[string]any)
	if !ok {
		dock = map[string]any{}
		data["dock"] = dock
	}
	// Fill absent keys.
	if _, ok := dock["iconSize"]; !ok {
		dock["iconSize"] = 30
	}
	if _, ok := dock["gap"]; !ok {
		dock["gap"] = 10
	}
	if _, ok := dock["autoHide"]; !ok {
		dock["autoHide"] = true
	}
	// Adopt the current sizing when the stored values are prior shipped defaults
	// (auto-assigned, never picked via the sliders), so default changes take
	// effect once. Any other value is user-chosen and left alone.
	if size, ok := dock["iconSize"].(float64); ok && (size == 44 || size == 48 || size == 60) {
		dock["iconSize"] = 30
	}
	if gap, ok := dock["gap"].(float64); ok && gap == 12 {
		dock["gap"] = 10
	}
	if _, ok := dock["apps"]; ok {
		return
	}
	dock["apps"] = buildDockApps(apps.DefaultSelection(7))
}

// buildDockApps maps the chosen apps to dock entries. WMClass lets the frontend
// match a running window so the dock shows a dot and focuses instead of relaunching.
func buildDockApps(selection []apps.App) []any {
	entries := make([]any, 0, len(selection))
	for _, app := range selection {
		entries = append(entries, map[string]any{
			"id":      app.ID,
			"label":   app.Name,
			"exec":    app.Exec,
			"icon":    app.Icon,
			"wmClass": app.WMClass,
		})
	}
	return entries
}

// seedWallpaper picks a default background from the user's ~/Pictures on first
// run, so the desktop has a wallpaper out of the box. A configured value wins.
func seedWallpaper(data map[string]any) {
	appearance, ok := data["appearance"].(map[string]any)
	if !ok {
		return
	}
	if current, _ := appearance["wallpaper"].(string); current != "" {
		return
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return
	}
	if image := firstImage(filepath.Join(home, "Pictures", "Wallpapers")); image != "" {
		appearance["wallpaper"] = image
	}
}

// firstImage returns the alphabetically-first JPEG/PNG directly in dir, or "".
func firstImage(dir string) string {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return ""
	}
	var names []string
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := strings.ToLower(entry.Name())
		if strings.HasSuffix(name, ".jpg") || strings.HasSuffix(name, ".jpeg") ||
			strings.HasSuffix(name, ".png") {
			names = append(names, entry.Name())
		}
	}
	if len(names) == 0 {
		return ""
	}
	sort.Strings(names)
	return filepath.Join(dir, names[0])
}

// buildDesktopIcons lays the chosen apps out in an 8px-aligned left column. The
// column origin and row pitch are multiples of 8 so the seeded positions sit on
// the virtual grid and clear the 96px icon height.
func buildDesktopIcons(selection []apps.App) []any {
	const (
		columnX = 16
		firstY  = 16
		rowStep = 112
	)
	icons := make([]any, 0, len(selection))
	y := firstY
	for _, app := range selection {
		icons = append(icons, map[string]any{
			"id":    app.ID,
			"label": app.Name,
			"exec":  app.Exec,
			"icon":  app.Icon,
			"x":     columnX,
			"y":     y,
		})
		y += rowStep
	}
	return icons
}

// mergeInto overlays src onto dst recursively: maps merge key by key, every other
// value replaces. dst keeps keys absent from src (the defaults).
func mergeInto(dst, src map[string]any) {
	for key, srcValue := range src {
		dstValue, exists := dst[key]
		srcMap, srcIsMap := srcValue.(map[string]any)
		dstMap, dstIsMap := dstValue.(map[string]any)
		if exists && srcIsMap && dstIsMap {
			mergeInto(dstMap, srcMap)
			continue
		}
		dst[key] = srcValue
	}
}

// assign sets value at the given path, creating intermediate maps. Fails if a
// path segment crosses a non-map value.
func assign(node map[string]any, path []string, value any) error {
	head := path[0]
	if len(path) == 1 {
		node[head] = value
		return nil
	}
	child, ok := node[head].(map[string]any)
	if !ok {
		child = map[string]any{}
		node[head] = child
	}
	return assign(child, path[1:], value)
}

func lookup(node map[string]any, path []string) (any, bool) {
	value, ok := node[path[0]]
	if !ok {
		return nil, false
	}
	if len(path) == 1 {
		return value, true
	}
	child, ok := value.(map[string]any)
	if !ok {
		return nil, false
	}
	return lookup(child, path[1:])
}

func deepCopy(node map[string]any) map[string]any {
	raw, _ := json.Marshal(node)
	var copy map[string]any
	_ = json.Unmarshal(raw, &copy)
	return copy
}
