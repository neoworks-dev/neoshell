// Package capability defines the shared action contract that makes neoshell's
// surfaces cohere. A capability is a feature (timer, windows…) that declares one
// or more actions; each action is invocable by name from any surface. Declaring
// a feature once here means two surfaces never reimplement the same behavior.
//
// Capabilities are registered in-tree today. The Capability interface is the
// seam an external plugin host will implement later, so nothing outside this
// package assumes a compiled-in registry.
package capability

import "context"

// ParamSpec describes one action parameter.
type ParamSpec struct {
	Type        string // "string", "number", "integer", "boolean", "array"
	Description string
	Required    bool
}

// Source is an optional file citation attached to a result.
type Source struct {
	Path string
	Name string
}

// Result is the outcome of running an action. Text is shown to the caller as a
// confirmation line.
type Result struct {
	Text    string
	Sources []Source
}

// Handler runs one action. Arguments arrive loosely typed: JSON numbers are
// float64, and optional parameters may be absent.
type Handler func(ctx context.Context, arguments map[string]any) (Result, error)

// Action is a single capability entry point, invoked by name.
type Action struct {
	Name        string
	Description string
	Params      map[string]ParamSpec
	Handler     Handler
}

// Capability is a coherent feature contributing one or more actions. ID matches
// its config key under plugins.providers.<ID>, so one toggle withdraws the whole
// feature.
type Capability interface {
	ID() string
	Actions() []Action
}
