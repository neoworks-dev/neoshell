// Package windows exposes Hyprland window and workspace control as capability
// actions, so an agent can arrange the desktop through the same registry the
// launcher uses.
//
// The handlers deliberately do more than forward a dispatch. A model does not
// hold window addresses, and Hyprland silently ignores pixel geometry on tiled
// windows — pushing either problem onto the caller would make every request a
// three-turn negotiation. Resolution and floating are handled here, once.
package windows

import (
	"fmt"
	"sort"
	"strings"

	"github.com/neoworks/neoshell/internal/hyprland"
)

// Service resolves window references and issues Hyprland dispatches.
type Service struct {
	hypr *hyprland.Client
}

func New(hypr *hyprland.Client) *Service {
	return &Service{hypr: hypr}
}

// ambiguousError lists the candidates a reference matched, so the model can
// retry with an address instead of guessing again.
type ambiguousError struct {
	reference string
	matches   []hyprland.Window
}

func (e ambiguousError) Error() string {
	names := make([]string, 0, len(e.matches))
	for _, window := range e.matches {
		names = append(names, fmt.Sprintf("%s (%s, %s)", window.Class, truncate(window.Title, 40), window.Address))
	}
	return fmt.Sprintf("%q matches %d windows: %s — repeat with one of these addresses",
		e.reference, len(e.matches), strings.Join(names, "; "))
}

// resolve turns a loose window reference into exactly one window. It accepts an
// address, a class, or a title fragment, in that order of specificity: an
// address is exact, and a class match beats a title match so that "firefox"
// picks the browser rather than whichever window happens to mention it.
func (s *Service) resolve(address, class, title string) (hyprland.Window, error) {
	all, err := s.hypr.Windows()
	if err != nil {
		return hyprland.Window{}, fmt.Errorf("list windows: %w", err)
	}
	if len(all) == 0 {
		return hyprland.Window{}, fmt.Errorf("no windows are open")
	}

	if address != "" {
		for _, window := range all {
			if strings.EqualFold(window.Address, address) {
				return window, nil
			}
		}
		return hyprland.Window{}, fmt.Errorf("no window with address %q", address)
	}

	if class != "" {
		if match, err := pick(class, all, func(w hyprland.Window) string { return w.Class }); err == nil || !isNoMatch(err) {
			return match, err
		}
		// A class that matches nothing is often really a title; fall through.
		if title == "" {
			title = class
		}
	}
	if title != "" {
		return pick(title, all, func(w hyprland.Window) string { return w.Title })
	}
	return hyprland.Window{}, fmt.Errorf("name a window by address, class, or title")
}

type noMatchError struct{ reference string }

func (e noMatchError) Error() string { return fmt.Sprintf("no window matches %q", e.reference) }

func isNoMatch(err error) bool {
	_, ok := err.(noMatchError)
	return ok
}

// pick finds the single window whose field matches the reference. An exact
// case-insensitive match wins outright; otherwise substring matches must be
// unambiguous.
func pick(reference string, all []hyprland.Window, field func(hyprland.Window) string) (hyprland.Window, error) {
	needle := strings.ToLower(strings.TrimSpace(reference))
	var exact, partial []hyprland.Window
	for _, window := range all {
		value := strings.ToLower(field(window))
		switch {
		case value == needle:
			exact = append(exact, window)
		case needle != "" && strings.Contains(value, needle):
			partial = append(partial, window)
		}
	}
	matches := exact
	if len(matches) == 0 {
		matches = partial
	}
	switch len(matches) {
	case 0:
		return hyprland.Window{}, noMatchError{reference: reference}
	case 1:
		return matches[0], nil
	default:
		return hyprland.Window{}, ambiguousError{reference: reference, matches: matches}
	}
}

// ensureFloating floats a window if it is tiled, because movewindowpixel and
// resizewindowpixel are silently ignored on tiled windows. It reports whether
// it changed anything so the caller can say so — a window that jumps out of the
// layout is a surprise worth narrating.
func (s *Service) ensureFloating(window hyprland.Window) (bool, error) {
	if window.Floating {
		return false, nil
	}
	if err := s.hypr.Dispatch("togglefloating", "address:"+window.Address); err != nil {
		return false, fmt.Errorf("float window: %w", err)
	}
	return true, nil
}

// describe renders a window as one line of the list table.
func describe(window hyprland.Window) string {
	state := "tiled"
	if window.Floating {
		state = "floating"
	}
	if window.Fullscreen != 0 {
		state += ", fullscreen"
	}
	workspace := window.Workspace.Name
	if workspace == "" {
		workspace = fmt.Sprint(window.Workspace.ID)
	}
	return fmt.Sprintf("%s — %s | workspace %s | %dx%d at %d,%d | %s | %s",
		window.Class, truncate(window.Title, 60), workspace,
		window.Size[0], window.Size[1], window.At[0], window.At[1],
		state, window.Address)
}

// visible drops windows the user cannot act on: unmapped ones, and the shell's
// own layer surfaces, which are not clients at all.
func visible(all []hyprland.Window) []hyprland.Window {
	out := make([]hyprland.Window, 0, len(all))
	for _, window := range all {
		if !window.Mapped || window.Hidden {
			continue
		}
		out = append(out, window)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Workspace.ID != out[j].Workspace.ID {
			return out[i].Workspace.ID < out[j].Workspace.ID
		}
		return out[i].Class < out[j].Class
	})
	return out
}

func truncate(value string, limit int) string {
	runes := []rune(value)
	if len(runes) <= limit {
		return value
	}
	return string(runes[:limit-1]) + "…"
}
