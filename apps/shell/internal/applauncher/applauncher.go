// Package applauncher exposes application launching as capability actions.
//
// It deliberately separates two grants that look similar and are not:
// apps:launch resolves a name against the installed .desktop entries and runs
// only what is already on the system, while apps:run executes an arbitrary
// shell command. Collapsing them would mean approving "open Firefox" and
// granting a shell in the same breath.
package applauncher

import (
	"fmt"
	"sort"
	"strings"

	"github.com/neoworks/neoshell/internal/apps"
)

type Service struct{}

func New() *Service { return &Service{} }

// resolve finds the single installed application a loose name refers to,
// matching against the .desktop id, the display name, and the startup WM class.
func resolve(reference string) (apps.App, error) {
	needle := strings.ToLower(strings.TrimSpace(reference))
	if needle == "" {
		return apps.App{}, fmt.Errorf("name an application")
	}

	var exact, partial []apps.App
	for _, app := range apps.List() {
		switch classify(needle, app.ID, app.Name, app.WMClass) {
		case matchExact:
			exact = append(exact, app)
		case matchPartial:
			partial = append(partial, app)
		}
	}

	matches := exact
	if len(matches) == 0 {
		matches = partial
	}
	switch len(matches) {
	case 0:
		return apps.App{}, fmt.Errorf("no installed application matches %q", reference)
	case 1:
		return matches[0], nil
	}

	names := make([]string, 0, len(matches))
	for _, app := range matches {
		names = append(names, app.Name)
	}
	sort.Strings(names)
	if len(names) > 8 {
		names = names[:8]
	}
	return apps.App{}, fmt.Errorf("%q matches several applications: %s — be more specific",
		reference, strings.Join(names, ", "))
}

type matchKind int

const (
	matchNone matchKind = iota
	matchPartial
	matchExact
)

// classify scores a needle against an app's identifying fields, taking the
// strongest match any field yields.
func classify(needle string, fields ...string) matchKind {
	best := matchNone
	for _, field := range fields {
		value := strings.ToLower(field)
		if value == "" {
			continue
		}
		if value == needle {
			return matchExact
		}
		if strings.Contains(value, needle) {
			best = matchPartial
		}
	}
	return best
}

// shellQuote single-quotes a string for safe use inside an `sh -c` command.
func shellQuote(value string) string {
	return "'" + strings.ReplaceAll(value, "'", `'\''`) + "'"
}
