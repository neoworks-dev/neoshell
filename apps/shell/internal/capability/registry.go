package capability

import (
	"context"
	"fmt"
	"sort"
)

// Registry holds registered capabilities and indexes their actions by name.
// Action names are object:verb (e.g. "timer:start") — the form surfaces and
// config use.
type Registry struct {
	capabilities []Capability
	actions      map[string]Action
	owner        map[string]string // action name -> capability id
}

func NewRegistry() *Registry {
	return &Registry{
		actions: make(map[string]Action),
		owner:   make(map[string]string),
	}
}

// Register indexes a capability's actions. A duplicate action name is a
// programming error, so it panics at startup rather than failing silently.
func (r *Registry) Register(capability Capability) {
	r.capabilities = append(r.capabilities, capability)
	for _, action := range capability.Actions() {
		if _, exists := r.actions[action.Name]; exists {
			panic("capability: duplicate action name " + action.Name)
		}
		r.actions[action.Name] = action
		r.owner[action.Name] = capability.ID()
	}
}

// Has reports whether an action is registered under this name.
func (r *Registry) Has(name string) bool {
	_, ok := r.actions[name]
	return ok
}

// Owner returns the capability id that contributed an action, or "" if unknown.
func (r *Registry) Owner(name string) string {
	return r.owner[name]
}

// Invoke runs an action by name.
func (r *Registry) Invoke(ctx context.Context, name string, arguments map[string]any) (Result, error) {
	action, ok := r.actions[name]
	if !ok {
		return Result{}, fmt.Errorf("unknown action %q", name)
	}
	return action.Handler(ctx, arguments)
}

// EnabledFunc reports whether a capability id is enabled, backed by config.
type EnabledFunc func(capabilityID string) bool

// Actions returns the actions of enabled capabilities, sorted by name for
// stable ordering. A nil enabled func includes everything.
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
