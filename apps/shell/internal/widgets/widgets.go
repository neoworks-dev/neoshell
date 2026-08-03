// Package widgets exposes the desktop's widget layout as capability actions.
//
// There is no widget runtime here. Widgets live in config under
// desktop.widgets, and the desktop surface re-renders whenever that key
// changes, so creating one is a config write and nothing more. That is what
// lets an agent build a widget without any new frontend plumbing.
package widgets

import (
	"fmt"
	"strings"

	"github.com/neoworks/neoshell/internal/config"
)

// widgetsKey is the single config key this package owns.
const widgetsKey = "desktop.widgets"

// TypesFunc reports the widget types the frontend has registered. Go cannot
// know them — they are declared by UI capabilities at runtime and announced
// over the relay — so the list is injected and read on every call rather than
// captured once.
type TypesFunc func() []Type

// Type is one registrable widget kind, as announced by the desktop surface.
type Type struct {
	Type  string `json:"type"`
	Label string `json:"label"`
}

// Widget mirrors the desktop surface's stored shape. Sizes use w/h rather than
// width/height because that is what the frontend already persists.
type Widget struct {
	ID   string  `json:"id"`
	Type string  `json:"type"`
	X    float64 `json:"x"`
	Y    float64 `json:"y"`
	W    float64 `json:"w"`
	H    float64 `json:"h"`
	Text string  `json:"text,omitempty"`
}

type Service struct {
	cfg   *config.Store
	types TypesFunc
}

func New(cfg *config.Store, types TypesFunc) *Service {
	return &Service{cfg: cfg, types: types}
}

// load reads the stored widgets. Config round-trips through JSON, so every
// entry is a map[string]any and every number a float64.
func (s *Service) load() []Widget {
	value, ok := s.cfg.Get(widgetsKey)
	if !ok {
		return nil
	}
	raw, ok := value.([]any)
	if !ok {
		return nil
	}
	widgets := make([]Widget, 0, len(raw))
	for _, item := range raw {
		entry, ok := item.(map[string]any)
		if !ok {
			continue
		}
		widgets = append(widgets, Widget{
			ID:   str(entry["id"]),
			Type: str(entry["type"]),
			X:    num(entry["x"]),
			Y:    num(entry["y"]),
			W:    num(entry["w"]),
			H:    num(entry["h"]),
			Text: str(entry["text"]),
		})
	}
	return widgets
}

// save writes the list back, dropping empty text so a non-editable widget does
// not gain a stray field.
func (s *Service) save(widgets []Widget) error {
	out := make([]any, 0, len(widgets))
	for _, widget := range widgets {
		entry := map[string]any{
			"id": widget.ID, "type": widget.Type,
			"x": widget.X, "y": widget.Y, "w": widget.W, "h": widget.H,
		}
		if widget.Text != "" {
			entry["text"] = widget.Text
		}
		out = append(out, entry)
	}
	return s.cfg.Set(widgetsKey, out)
}

// knownTypes returns the registered type names, or nil when the desktop surface
// has not announced them yet.
func (s *Service) knownTypes() []Type {
	if s.types == nil {
		return nil
	}
	return s.types()
}

// validateType checks a requested type against what the frontend actually
// offers. An unknown type would persist a widget the desktop cannot render, so
// it fails with the real list rather than writing a placeholder.
func (s *Service) validateType(name string) error {
	types := s.knownTypes()
	if len(types) == 0 {
		// The desktop surface has not reported in. Accept the write rather
		// than blocking on a race the user cannot see or fix.
		return nil
	}
	names := make([]string, 0, len(types))
	for _, kind := range types {
		if strings.EqualFold(kind.Type, name) {
			return nil
		}
		names = append(names, kind.Type)
	}
	return fmt.Errorf("unknown widget type %q; available: %s", name, strings.Join(names, ", "))
}

// nextID mints a stable, collision-free id in the frontend's own format.
func nextID(kind string, existing []Widget) string {
	taken := make(map[string]bool, len(existing))
	for _, widget := range existing {
		taken[widget.ID] = true
	}
	for n := len(existing); ; n++ {
		id := fmt.Sprintf("%s-%d", kind, n)
		if !taken[id] {
			return id
		}
	}
}

func str(value any) string {
	s, _ := value.(string)
	return s
}

func num(value any) float64 {
	switch n := value.(type) {
	case float64:
		return n
	case int:
		return float64(n)
	}
	return 0
}
