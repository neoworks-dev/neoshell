// Package capability defines the shared action contract that makes neoshell's
// surfaces cohere. A capability is a feature (timer, files, windows…) that
// declares one or more actions; each action is exposed both to the AI as a
// callable tool and to the launcher as an invocable command under the same
// name. Declaring a feature once here means the AI and the launcher never drift
// apart or reimplement the same behavior.
//
// Capabilities are registered in-tree today. The Capability interface is the
// seam an external plugin host will implement later, so nothing outside this
// package assumes a compiled-in registry.
package capability

import (
	"context"
	"sort"
)

// ParamSpec describes one action parameter. It drives both the launcher input
// and the AI tool's JSON Schema, so a single description reaches both.
type ParamSpec struct {
	Type        string // JSON Schema type: "string", "number", "integer", "boolean", "array"
	Description string
	Required    bool
}

// Policy is how an agent host should gate an action before running it. It is
// advice from the capability, not enforcement: the host decides what "ask"
// means (a prompt, a keybind, a standing approval) and the user has the last
// word. Actions that only read state declare PolicyAllow so the agent can
// orient itself without interrupting anyone.
type Policy string

const (
	// PolicyAsk requires a human yes before the handler runs. It is the zero
	// value's meaning, so a capability that forgets to declare a policy gets
	// the safe one.
	PolicyAsk Policy = "ask"
	// PolicyAllow runs without confirmation.
	PolicyAllow Policy = "allow"
)

// Source is an optional file citation attached to a result.
type Source struct {
	Path string
	Name string
}

// Result is the outcome of running an action. Text is fed back to the AI as a
// tool observation and shown to the launcher as a confirmation line.
type Result struct {
	Text    string
	Sources []Source
}

// Handler runs one action. Arguments arrive loosely typed: JSON numbers are
// float64, and optional parameters may be absent.
type Handler func(ctx context.Context, arguments map[string]any) (Result, error)

// Action is a single capability entry point, invoked by name from either the AI
// tool loop or the launcher.
type Action struct {
	Name        string
	Description string
	Params      map[string]ParamSpec
	// Policy defaults to PolicyAsk when empty; read EffectivePolicy, not this.
	Policy  Policy
	Handler Handler
}

// EffectivePolicy resolves the declared policy, defaulting an unset one to
// PolicyAsk so an action is never silently auto-approved by omission.
func (a Action) EffectivePolicy() Policy {
	if a.Policy == PolicyAllow {
		return PolicyAllow
	}
	return PolicyAsk
}

// JSONSchema renders the action's parameters as a JSON Schema object for use in
// an AI tool specification.
func (a Action) JSONSchema() map[string]any {
	properties := make(map[string]any, len(a.Params))
	var required []string
	for name, spec := range a.Params {
		properties[name] = map[string]any{
			"type":        spec.Type,
			"description": spec.Description,
		}
		if spec.Required {
			required = append(required, name)
		}
	}
	sort.Strings(required)

	schema := map[string]any{
		"type":       "object",
		"properties": properties,
	}
	if len(required) > 0 {
		schema["required"] = required
	}
	return schema
}

// Capability is a coherent feature contributing one or more actions. ID matches
// its config key under plugins.providers.<ID>, so the same toggle that hides a
// launcher provider also withdraws its AI tools.
type Capability interface {
	ID() string
	Actions() []Action
}
