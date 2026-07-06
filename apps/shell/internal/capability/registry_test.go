package capability

import (
	"context"
	"testing"
)

type fakeCapability struct {
	id      string
	actions []Action
}

func (f fakeCapability) ID() string        { return f.id }
func (f fakeCapability) Actions() []Action { return f.actions }

func echoAction(name string) Action {
	return Action{
		Name: name,
		Params: map[string]ParamSpec{
			"value": {Type: "string", Description: "echoed back", Required: true},
		},
		Handler: func(ctx context.Context, arguments map[string]any) (Result, error) {
			return Result{Text: name + ":" + stringArg(arguments, "value")}, nil
		},
	}
}

func stringArg(arguments map[string]any, key string) string {
	value, _ := arguments[key].(string)
	return value
}

func TestRegistryInvoke(t *testing.T) {
	registry := NewRegistry()
	registry.Register(fakeCapability{id: "demo", actions: []Action{echoAction("thing:do")}})

	if !registry.Has("thing:do") {
		t.Fatal("expected registered action to be present")
	}
	if owner := registry.Owner("thing:do"); owner != "demo" {
		t.Fatalf("owner = %q, want demo", owner)
	}

	result, err := registry.Invoke(context.Background(), "thing:do", map[string]any{"value": "hi"})
	if err != nil {
		t.Fatalf("invoke: %v", err)
	}
	if result.Text != "thing:do:hi" {
		t.Fatalf("text = %q", result.Text)
	}
}

// The AI sees the sanitized alias; it must resolve back to the canonical action.
func TestRegistryResolvesToolAlias(t *testing.T) {
	registry := NewRegistry()
	registry.Register(fakeCapability{id: "demo", actions: []Action{echoAction("thing:do")}})

	alias := ToolName("thing:do")
	if alias != "thing_do" {
		t.Fatalf("alias = %q, want thing_do", alias)
	}
	if !registry.Has(alias) {
		t.Fatal("expected alias to resolve")
	}
	if owner := registry.Owner(alias); owner != "demo" {
		t.Fatalf("owner via alias = %q, want demo", owner)
	}
	result, err := registry.Invoke(context.Background(), alias, map[string]any{"value": "x"})
	if err != nil {
		t.Fatalf("invoke via alias: %v", err)
	}
	if result.Text != "thing:do:x" {
		t.Fatalf("text = %q", result.Text)
	}
}

func TestRegistryInvokeUnknown(t *testing.T) {
	registry := NewRegistry()
	if _, err := registry.Invoke(context.Background(), "missing", nil); err == nil {
		t.Fatal("expected error for unknown action")
	}
}

func TestRegistryActionsRespectEnabled(t *testing.T) {
	registry := NewRegistry()
	registry.Register(fakeCapability{id: "on", actions: []Action{echoAction("a")}})
	registry.Register(fakeCapability{id: "off", actions: []Action{echoAction("b")}})

	enabled := func(id string) bool { return id == "on" }
	actions := registry.Actions(enabled)
	if len(actions) != 1 || actions[0].Name != "a" {
		t.Fatalf("enabled filter returned %+v", actions)
	}

	all := registry.Actions(nil)
	if len(all) != 2 {
		t.Fatalf("nil filter returned %d actions, want 2", len(all))
	}
}

func TestDuplicateActionPanics(t *testing.T) {
	defer func() {
		if recover() == nil {
			t.Fatal("expected panic on duplicate action name")
		}
	}()
	registry := NewRegistry()
	registry.Register(fakeCapability{id: "one", actions: []Action{echoAction("dup")}})
	registry.Register(fakeCapability{id: "two", actions: []Action{echoAction("dup")}})
}

func TestActionJSONSchema(t *testing.T) {
	schema := echoAction("x").JSONSchema()
	if schema["type"] != "object" {
		t.Fatalf("type = %v", schema["type"])
	}
	required, ok := schema["required"].([]string)
	if !ok || len(required) != 1 || required[0] != "value" {
		t.Fatalf("required = %v", schema["required"])
	}
	properties, ok := schema["properties"].(map[string]any)
	if !ok {
		t.Fatalf("properties missing: %v", schema["properties"])
	}
	if _, ok := properties["value"]; !ok {
		t.Fatal("expected 'value' property in schema")
	}
}
