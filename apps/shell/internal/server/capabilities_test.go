package server

import (
	"strings"
	"testing"

	"github.com/neoworks/neoshell/internal/applauncher"
	"github.com/neoworks/neoshell/internal/capability"
	"github.com/neoworks/neoshell/internal/overlay"
	"github.com/neoworks/neoshell/internal/timers"
	"github.com/neoworks/neoshell/internal/widgets"
	"github.com/neoworks/neoshell/internal/windows"
)

// buildRegistry mirrors the registration order in New. Every capability is
// constructed with nil dependencies: Capability() must not touch them, since
// only a handler invocation should reach a service.
func buildRegistry(t *testing.T) *capability.Registry {
	t.Helper()
	registry := capability.NewRegistry()
	registry.Register(timers.New(func(timers.State) {}).Capability())
	registry.Register(windows.New(nil).Capability())
	registry.Register(applauncher.New().Capability())
	registry.Register(widgets.New(nil, nil).Capability())
	registry.Register(overlay.New(nil, nil).Capability())
	return registry
}

// Register panics on a duplicate action name, so the shell would die at startup
// rather than boot with a missing capability. This test is the cheap way to find
// that out before a user does.
func TestRegistryHasNoNameCollisions(t *testing.T) {
	registry := buildRegistry(t)

	actions := registry.Actions(nil)
	if len(actions) == 0 {
		t.Fatal("no actions registered")
	}
	for _, action := range actions {
		if !registry.Has(action.Name) {
			t.Errorf("%s: registered action is not resolvable", action.Name)
		}
	}
}

// A missing description or an unhandled parameter type degrades an action
// silently rather than crashing. Assert the contract instead.
func TestActionsAreWellFormed(t *testing.T) {
	valid := map[string]bool{"string": true, "number": true, "integer": true, "boolean": true, "array": true}

	for _, action := range buildRegistry(t).Actions(nil) {
		if !strings.Contains(action.Name, ":") {
			t.Errorf("%s: name should be object:verb", action.Name)
		}
		if action.Description == "" {
			t.Errorf("%s: missing description", action.Name)
		}
		if action.Handler == nil {
			t.Errorf("%s: missing handler", action.Name)
		}
		for name, spec := range action.Params {
			if !valid[spec.Type] {
				t.Errorf("%s.%s: unsupported type %q", action.Name, name, spec.Type)
			}
			if spec.Description == "" {
				t.Errorf("%s.%s: missing description", action.Name, name)
			}
		}
	}
}
