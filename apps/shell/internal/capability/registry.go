package capability

import (
	"context"
	"fmt"
	"sort"
	"strings"
)

// Registry holds registered capabilities and indexes their actions by name. It
// is the single source of truth both the AI tool loop and the launcher query.
//
// Canonical action names are object:verb (e.g. "timer:start") — the form the
// launcher and config use. AI tool-name charsets forbid ":", so each action
// also has a sanitized alias ("timer_start") that resolves back to the
// canonical name on dispatch.
type Registry struct {
	capabilities []Capability
	actions      map[string]Action
	owner        map[string]string // canonical name -> capability id
	aliases      map[string]string // sanitized tool name -> canonical name
}

func NewRegistry() *Registry {
	return &Registry{
		actions: make(map[string]Action),
		owner:   make(map[string]string),
		aliases: make(map[string]string),
	}
}

// ToolName sanitizes a canonical object:verb name into an AI-tool-safe form.
func ToolName(canonical string) string {
	return strings.ReplaceAll(canonical, ":", "_")
}

// Register indexes a capability's actions. A duplicate action name is a
// programming error, so it panics at startup rather than failing silently.
func (r *Registry) Register(capability Capability) {
	r.capabilities = append(r.capabilities, capability)
	for _, action := range capability.Actions() {
		if _, exists := r.actions[action.Name]; exists {
			panic("capability: duplicate action name " + action.Name)
		}
		alias := ToolName(action.Name)
		if existing, clash := r.aliases[alias]; clash {
			panic("capability: tool-name alias " + alias + " clashes (" + existing + " vs " + action.Name + ")")
		}
		r.actions[action.Name] = action
		r.owner[action.Name] = capability.ID()
		r.aliases[alias] = action.Name
	}
}

// canonical resolves either a canonical name or a sanitized tool alias to the
// canonical action name.
func (r *Registry) canonical(name string) (string, bool) {
	if _, ok := r.actions[name]; ok {
		return name, true
	}
	if resolved, ok := r.aliases[name]; ok {
		return resolved, true
	}
	return "", false
}

// Has reports whether an action is registered under this canonical name or its
// sanitized tool alias.
func (r *Registry) Has(name string) bool {
	_, ok := r.canonical(name)
	return ok
}

// Owner returns the capability id that contributed an action, or "" if unknown.
// Accepts a canonical name or a tool alias.
func (r *Registry) Owner(name string) string {
	canonical, ok := r.canonical(name)
	if !ok {
		return ""
	}
	return r.owner[canonical]
}

// Invoke runs an action by canonical name or tool alias.
func (r *Registry) Invoke(ctx context.Context, name string, arguments map[string]any) (Result, error) {
	canonical, ok := r.canonical(name)
	if !ok {
		return Result{}, fmt.Errorf("unknown action %q", name)
	}
	return r.actions[canonical].Handler(ctx, arguments)
}

// EnabledFunc reports whether a capability id is enabled, backed by config.
type EnabledFunc func(capabilityID string) bool

// Actions returns the actions of enabled capabilities, sorted by name for
// stable tool ordering. A nil enabled func includes everything.
func (r *Registry) Actions(enabled EnabledFunc) []Action {
	list := make([]Action, 0, len(r.actions))
	for name, action := range r.actions {
		if enabled != nil && !enabled(r.owner[name]) {
			continue
		}
		list = append(list, action)
	}
	sort.Slice(list, func(i, j int) bool { return list[i].Name < list[j].Name })
	return list
}
