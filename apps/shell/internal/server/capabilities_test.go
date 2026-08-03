package server

import (
	"strings"
	"testing"

	"github.com/neoworks/neoshell/internal/applauncher"
	"github.com/neoworks/neoshell/internal/capability"
	"github.com/neoworks/neoshell/internal/files"
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
	registry.Register(files.New(nil).Capability())
	registry.Register(widgets.New(nil, nil).Capability())
	registry.Register(overlay.New(nil, nil).Capability())
	return registry
}

// Register panics on a duplicate action name or a clashing tool alias, so the
// shell would die at startup rather than boot with a missing capability. This
// test is the cheap way to find that out before a user does.
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
		if !registry.Has(capability.ToolName(action.Name)) {
			t.Errorf("%s: tool alias %s does not resolve", action.Name, capability.ToolName(action.Name))
		}
	}
}

// Every action reaches a model as a tool description and a JSON schema, so a
// missing description or an unhandled parameter type is a silently degraded
// tool rather than a crash. Assert the contract instead.
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
		if policy := action.EffectivePolicy(); policy != capability.PolicyAsk && policy != capability.PolicyAllow {
			t.Errorf("%s: unexpected policy %q", action.Name, policy)
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

// A read-only action must not ask, and an action that changes the user's
// machine must. Getting this backwards is how an agent quietly rearranges a
// desktop, so pin the two ends explicitly.
func TestPolicyMatchesEffect(t *testing.T) {
	expected := map[string]capability.Policy{
		"windows:list":    capability.PolicyAllow,
		"workspace:list":  capability.PolicyAllow,
		"apps:list":       capability.PolicyAllow,
		"files:search":    capability.PolicyAllow,
		"files:read":      capability.PolicyAllow,
		"widgets:types":   capability.PolicyAllow,
		"widgets:list":    capability.PolicyAllow,
		"windows:close":   capability.PolicyAsk,
		"windows:move":    capability.PolicyAsk,
		"apps:launch":     capability.PolicyAsk,
		"apps:run":        capability.PolicyAsk,
		"widgets:add":     capability.PolicyAsk,
		"overlay:surface": capability.PolicyAsk,
	}

	byName := make(map[string]capability.Action)
	for _, action := range buildRegistry(t).Actions(nil) {
		byName[action.Name] = action
	}
	for name, want := range expected {
		action, ok := byName[name]
		if !ok {
			t.Errorf("%s: not registered", name)
			continue
		}
		if got := action.EffectivePolicy(); got != want {
			t.Errorf("%s: policy = %q, want %q", name, got, want)
		}
	}
}
