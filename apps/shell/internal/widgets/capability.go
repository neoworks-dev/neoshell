package widgets

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/neoworks/neoshell/internal/capability"
)

// Default geometry for a widget the agent creates without saying how big it
// should be. The frontend registry carries per-type defaults, but they live in
// TypeScript; these are the fallback so a bare "add a clock" still works.
const (
	defaultWidth  = 260
	defaultHeight = 120
)

func (s *Service) Capability() capability.Capability {
	return widgetCapability{service: s}
}

type widgetCapability struct {
	service *Service
}

func (c widgetCapability) ID() string { return "widgets" }

func (c widgetCapability) Actions() []capability.Action {
	return []capability.Action{
		{
			Name:        "widgets:types",
			Description: "List the widget types that can be placed on the desktop. Call this before widgets:add.",
			Params:      map[string]capability.ParamSpec{},
			Policy:      capability.PolicyAllow,
			Handler:     c.listTypes,
		},
		{
			Name:        "widgets:list",
			Description: "List the widgets currently on the desktop with their ids, positions, and sizes.",
			Params:      map[string]capability.ParamSpec{},
			Policy:      capability.PolicyAllow,
			Handler:     c.list,
		},
		{
			Name:        "widgets:add",
			Description: "Place a new widget on the desktop.",
			Params: map[string]capability.ParamSpec{
				"type":   {Type: "string", Description: "Widget type from widgets:types.", Required: true},
				"x":      {Type: "integer", Description: "Left position in pixels. Defaults to 200.", Required: false},
				"y":      {Type: "integer", Description: "Top position in pixels. Defaults to 16.", Required: false},
				"width":  {Type: "integer", Description: "Width in pixels.", Required: false},
				"height": {Type: "integer", Description: "Height in pixels.", Required: false},
				"text":   {Type: "string", Description: "Initial contents, for widget types that hold text.", Required: false},
			},
			Handler: c.add,
		},
		{
			Name:        "widgets:remove",
			Description: "Remove a widget from the desktop by its id.",
			Params: map[string]capability.ParamSpec{
				"id": {Type: "string", Description: "Widget id from widgets:list.", Required: true},
			},
			Handler: c.remove,
		},
		{
			Name:        "widgets:move",
			Description: "Reposition or resize an existing desktop widget. Omitted values are left alone.",
			Params: map[string]capability.ParamSpec{
				"id":     {Type: "string", Description: "Widget id from widgets:list.", Required: true},
				"x":      {Type: "integer", Description: "New left position in pixels.", Required: false},
				"y":      {Type: "integer", Description: "New top position in pixels.", Required: false},
				"width":  {Type: "integer", Description: "New width in pixels.", Required: false},
				"height": {Type: "integer", Description: "New height in pixels.", Required: false},
				"text":   {Type: "string", Description: "Replacement contents, for widget types that hold text.", Required: false},
			},
			Handler: c.move,
		},
	}
}

func (c widgetCapability) listTypes(context.Context, map[string]any) (capability.Result, error) {
	types := c.service.knownTypes()
	if len(types) == 0 {
		return capability.Result{Text: "The desktop has not reported its widget types yet."}, nil
	}
	var builder strings.Builder
	for _, kind := range types {
		if kind.Label != "" && kind.Label != kind.Type {
			fmt.Fprintf(&builder, "- %s (%s)\n", kind.Type, kind.Label)
			continue
		}
		fmt.Fprintf(&builder, "- %s\n", kind.Type)
	}
	return capability.Result{Text: strings.TrimRight(builder.String(), "\n")}, nil
}

func (c widgetCapability) list(context.Context, map[string]any) (capability.Result, error) {
	widgets := c.service.load()
	if len(widgets) == 0 {
		return capability.Result{Text: "No widgets on the desktop."}, nil
	}
	var builder strings.Builder
	for _, widget := range widgets {
		fmt.Fprintf(&builder, "- %s: %s at %g,%g sized %gx%g\n",
			widget.ID, widget.Type, widget.X, widget.Y, widget.W, widget.H)
	}
	return capability.Result{Text: strings.TrimRight(builder.String(), "\n")}, nil
}

func (c widgetCapability) add(_ context.Context, arguments map[string]any) (capability.Result, error) {
	kind := stringArg(arguments, "type")
	if kind == "" {
		return capability.Result{}, fmt.Errorf("type is required")
	}
	if err := c.service.validateType(kind); err != nil {
		return capability.Result{}, err
	}

	existing := c.service.load()
	widget := Widget{
		ID:   nextID(kind, existing),
		Type: kind,
		X:    numArgOr(arguments, "x", 200),
		Y:    numArgOr(arguments, "y", 16),
		W:    numArgOr(arguments, "width", defaultWidth),
		H:    numArgOr(arguments, "height", defaultHeight),
		Text: stringArg(arguments, "text"),
	}
	if err := c.service.save(append(existing, widget)); err != nil {
		return capability.Result{}, fmt.Errorf("save widgets: %w", err)
	}
	return capability.Result{Text: fmt.Sprintf("Added a %s widget (id %s).", kind, widget.ID)}, nil
}

func (c widgetCapability) remove(_ context.Context, arguments map[string]any) (capability.Result, error) {
	id := stringArg(arguments, "id")
	if id == "" {
		return capability.Result{}, fmt.Errorf("id is required")
	}
	existing := c.service.load()
	kept := make([]Widget, 0, len(existing))
	var removed *Widget
	for _, widget := range existing {
		if widget.ID == id {
			found := widget
			removed = &found
			continue
		}
		kept = append(kept, widget)
	}
	if removed == nil {
		return capability.Result{}, fmt.Errorf("no widget with id %q", id)
	}
	if err := c.service.save(kept); err != nil {
		return capability.Result{}, fmt.Errorf("save widgets: %w", err)
	}
	return capability.Result{Text: fmt.Sprintf("Removed the %s widget.", removed.Type)}, nil
}

func (c widgetCapability) move(_ context.Context, arguments map[string]any) (capability.Result, error) {
	id := stringArg(arguments, "id")
	if id == "" {
		return capability.Result{}, fmt.Errorf("id is required")
	}
	existing := c.service.load()
	index := -1
	for i, widget := range existing {
		if widget.ID == id {
			index = i
			break
		}
	}
	if index < 0 {
		return capability.Result{}, fmt.Errorf("no widget with id %q", id)
	}

	widget := existing[index]
	widget.X = numArgOr(arguments, "x", widget.X)
	widget.Y = numArgOr(arguments, "y", widget.Y)
	widget.W = numArgOr(arguments, "width", widget.W)
	widget.H = numArgOr(arguments, "height", widget.H)
	if text, ok := arguments["text"].(string); ok {
		widget.Text = text
	}
	existing[index] = widget

	if err := c.service.save(existing); err != nil {
		return capability.Result{}, fmt.Errorf("save widgets: %w", err)
	}
	return capability.Result{Text: fmt.Sprintf("Updated %s: %g,%g sized %gx%g.",
		widget.ID, widget.X, widget.Y, widget.W, widget.H)}, nil
}

func stringArg(arguments map[string]any, key string) string {
	value, ok := arguments[key].(string)
	if !ok {
		return ""
	}
	return strings.TrimSpace(value)
}

// numArgOr coerces a numeric argument, falling back when it is absent or
// unparseable. Models routinely send "200" where a number was asked for.
func numArgOr(arguments map[string]any, key string, fallback float64) float64 {
	switch value := arguments[key].(type) {
	case float64:
		return value
	case int:
		return float64(value)
	case string:
		if parsed, err := strconv.ParseFloat(strings.TrimSpace(value), 64); err == nil {
			return parsed
		}
	}
	return fallback
}
