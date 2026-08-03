package windows

import (
	"context"
	"fmt"
	"strings"

	"github.com/neoworks/neoshell/internal/capability"
	"github.com/neoworks/neoshell/internal/hyprland"
)

// Capability exposes window and workspace control to the agent host and the
// launcher. Queries are PolicyAllow so the agent can look before it leaps;
// everything that rearranges the user's screen asks first.
func (s *Service) Capability() capability.Capability {
	return windowCapability{service: s}
}

type windowCapability struct {
	service *Service
}

func (c windowCapability) ID() string { return "windows" }

// targetParams are the three interchangeable ways to name a window. Every
// mutating action takes all three and resolves them here rather than making the
// caller run windows:list first.
func targetParams() map[string]capability.ParamSpec {
	return map[string]capability.ParamSpec{
		"address": {Type: "string", Description: "Exact window address from windows:list (e.g. 0x55f1…). Most reliable.", Required: false},
		"class":   {Type: "string", Description: "Application class, e.g. firefox or Alacritty. Matched case-insensitively.", Required: false},
		"title":   {Type: "string", Description: "Fragment of the window title. Used when class is absent or matches nothing.", Required: false},
	}
}

func withTarget(extra map[string]capability.ParamSpec) map[string]capability.ParamSpec {
	params := targetParams()
	for name, spec := range extra {
		params[name] = spec
	}
	return params
}

func (c windowCapability) Actions() []capability.Action {
	return []capability.Action{
		{
			Name:        "windows:list",
			Description: "List the open windows with their class, title, workspace, geometry, and address. Call this first when a request names a window loosely.",
			Params:      map[string]capability.ParamSpec{},
			Policy:      capability.PolicyAllow,
			Handler:     c.list,
		},
		{
			Name:        "windows:focus",
			Description: "Focus a window, switching to its workspace if needed.",
			Params:      targetParams(),
			Handler:     c.focus,
		},
		{
			Name:        "windows:close",
			Description: "Close a window. The application may still prompt to save.",
			Params:      targetParams(),
			Handler:     c.close,
		},
		{
			Name:        "windows:move",
			Description: "Move a window to absolute screen coordinates. Floats the window first if it is tiled.",
			Params: withTarget(map[string]capability.ParamSpec{
				"x": {Type: "integer", Description: "Left edge in pixels.", Required: true},
				"y": {Type: "integer", Description: "Top edge in pixels.", Required: true},
			}),
			Handler: c.move,
		},
		{
			Name:        "windows:resize",
			Description: "Resize a window to an exact pixel size. Floats the window first if it is tiled.",
			Params: withTarget(map[string]capability.ParamSpec{
				"width":  {Type: "integer", Description: "Width in pixels.", Required: true},
				"height": {Type: "integer", Description: "Height in pixels.", Required: true},
			}),
			Handler: c.resize,
		},
		{
			Name:        "windows:float",
			Description: "Toggle a window between floating and tiled.",
			Params:      targetParams(),
			Handler:     c.float,
		},
		{
			Name:        "windows:fullscreen",
			Description: "Make a window fullscreen or restore it.",
			Params: withTarget(map[string]capability.ParamSpec{
				"enabled": {Type: "boolean", Description: "True for fullscreen, false to restore. Defaults to true.", Required: false},
			}),
			Handler: c.fullscreen,
		},
		{
			// No hyphen in the name: the tool alias is the canonical name with
			// colons swapped for underscores, and a hyphenated identifier is
			// needless risk across provider tool-name charsets.
			Name:        "windows:workspace",
			Description: "Move a window to another workspace without following it.",
			Params: withTarget(map[string]capability.ParamSpec{
				"workspace": {Type: "string", Description: "Workspace id or name.", Required: true},
			}),
			Handler: c.toWorkspace,
		},
		{
			Name:        "workspace:list",
			Description: "List the workspaces, their window counts, and which one is active.",
			Params:      map[string]capability.ParamSpec{},
			Policy:      capability.PolicyAllow,
			Handler:     c.listWorkspaces,
		},
		{
			Name:        "workspace:switch",
			Description: "Switch to a workspace by id or name.",
			Params: map[string]capability.ParamSpec{
				"workspace": {Type: "string", Description: "Workspace id or name.", Required: true},
			},
			Handler: c.switchWorkspace,
		},
	}
}

func (c windowCapability) list(context.Context, map[string]any) (capability.Result, error) {
	all, err := c.service.hypr.Windows()
	if err != nil {
		return capability.Result{}, fmt.Errorf("list windows: %w", err)
	}
	open := visible(all)
	if len(open) == 0 {
		return capability.Result{Text: "No windows are open."}, nil
	}
	var builder strings.Builder
	for _, window := range open {
		fmt.Fprintf(&builder, "- %s\n", describe(window))
	}
	return capability.Result{Text: strings.TrimRight(builder.String(), "\n")}, nil
}

// target resolves the address/class/title trio shared by every mutating action.
func (c windowCapability) target(arguments map[string]any) (hyprland.Window, error) {
	return c.service.resolve(
		stringArg(arguments, "address"),
		stringArg(arguments, "class"),
		stringArg(arguments, "title"),
	)
}

func (c windowCapability) focus(_ context.Context, arguments map[string]any) (capability.Result, error) {
	target, err := c.target(arguments)
	if err != nil {
		return capability.Result{}, err
	}
	if err := c.service.hypr.Dispatch("focuswindow", "address:"+target.Address); err != nil {
		return capability.Result{}, fmt.Errorf("focus window: %w", err)
	}
	return capability.Result{Text: "Focused " + label(target) + "."}, nil
}

func (c windowCapability) close(_ context.Context, arguments map[string]any) (capability.Result, error) {
	target, err := c.target(arguments)
	if err != nil {
		return capability.Result{}, err
	}
	if err := c.service.hypr.Dispatch("closewindow", "address:"+target.Address); err != nil {
		return capability.Result{}, fmt.Errorf("close window: %w", err)
	}
	return capability.Result{Text: "Closed " + label(target) + "."}, nil
}

func (c windowCapability) move(_ context.Context, arguments map[string]any) (capability.Result, error) {
	target, err := c.target(arguments)
	if err != nil {
		return capability.Result{}, err
	}
	x, okX := intArg(arguments, "x")
	y, okY := intArg(arguments, "y")
	if !okX || !okY {
		return capability.Result{}, fmt.Errorf("x and y are required")
	}
	floated, err := c.service.ensureFloating(target)
	if err != nil {
		return capability.Result{}, err
	}
	arg := fmt.Sprintf("exact %d %d,address:%s", x, y, target.Address)
	if err := c.service.hypr.Dispatch("movewindowpixel", arg); err != nil {
		return capability.Result{}, fmt.Errorf("move window: %w", err)
	}
	return capability.Result{Text: fmt.Sprintf("Moved %s to %d,%d.%s", label(target), x, y, floatNote(floated))}, nil
}

func (c windowCapability) resize(_ context.Context, arguments map[string]any) (capability.Result, error) {
	target, err := c.target(arguments)
	if err != nil {
		return capability.Result{}, err
	}
	width, okW := intArg(arguments, "width")
	height, okH := intArg(arguments, "height")
	if !okW || !okH {
		return capability.Result{}, fmt.Errorf("width and height are required")
	}
	if width <= 0 || height <= 0 {
		return capability.Result{}, fmt.Errorf("width and height must be positive")
	}
	floated, err := c.service.ensureFloating(target)
	if err != nil {
		return capability.Result{}, err
	}
	arg := fmt.Sprintf("exact %d %d,address:%s", width, height, target.Address)
	if err := c.service.hypr.Dispatch("resizewindowpixel", arg); err != nil {
		return capability.Result{}, fmt.Errorf("resize window: %w", err)
	}
	return capability.Result{Text: fmt.Sprintf("Resized %s to %dx%d.%s", label(target), width, height, floatNote(floated))}, nil
}

func (c windowCapability) float(_ context.Context, arguments map[string]any) (capability.Result, error) {
	target, err := c.target(arguments)
	if err != nil {
		return capability.Result{}, err
	}
	if err := c.service.hypr.Dispatch("togglefloating", "address:"+target.Address); err != nil {
		return capability.Result{}, fmt.Errorf("toggle floating: %w", err)
	}
	state := "floating"
	if target.Floating {
		state = "tiled"
	}
	return capability.Result{Text: fmt.Sprintf("%s is now %s.", label(target), state)}, nil
}

func (c windowCapability) fullscreen(_ context.Context, arguments map[string]any) (capability.Result, error) {
	target, err := c.target(arguments)
	if err != nil {
		return capability.Result{}, err
	}
	enabled := true
	if value, ok := arguments["enabled"].(bool); ok {
		enabled = value
	}
	// `fullscreen` acts on the focused window, so focus first. Hyprland has no
	// address-scoped fullscreen dispatcher.
	if err := c.service.hypr.Dispatch("focuswindow", "address:"+target.Address); err != nil {
		return capability.Result{}, fmt.Errorf("focus window: %w", err)
	}
	if (target.Fullscreen != 0) == enabled {
		return capability.Result{Text: fmt.Sprintf("%s is already %s.", label(target), fullscreenWord(enabled))}, nil
	}
	if err := c.service.hypr.Dispatch("fullscreen", "0"); err != nil {
		return capability.Result{}, fmt.Errorf("toggle fullscreen: %w", err)
	}
	return capability.Result{Text: fmt.Sprintf("%s is now %s.", label(target), fullscreenWord(enabled))}, nil
}

func (c windowCapability) toWorkspace(_ context.Context, arguments map[string]any) (capability.Result, error) {
	target, err := c.target(arguments)
	if err != nil {
		return capability.Result{}, err
	}
	workspace := workspaceArg(arguments)
	if workspace == "" {
		return capability.Result{}, fmt.Errorf("workspace is required")
	}
	arg := fmt.Sprintf("%s,address:%s", workspace, target.Address)
	if err := c.service.hypr.Dispatch("movetoworkspacesilent", arg); err != nil {
		return capability.Result{}, fmt.Errorf("move to workspace: %w", err)
	}
	return capability.Result{Text: fmt.Sprintf("Moved %s to workspace %s.", label(target), workspace)}, nil
}

func (c windowCapability) listWorkspaces(context.Context, map[string]any) (capability.Result, error) {
	spaces, err := c.service.hypr.Workspaces()
	if err != nil {
		return capability.Result{}, fmt.Errorf("list workspaces: %w", err)
	}
	active, _ := c.service.hypr.ActiveWorkspace()
	if len(spaces) == 0 {
		return capability.Result{Text: "No workspaces."}, nil
	}
	var builder strings.Builder
	for _, space := range spaces {
		marker := ""
		if space.ID == active.ID {
			marker = " (active)"
		}
		fmt.Fprintf(&builder, "- %s [id %d]: %d windows on %s%s\n",
			space.Name, space.ID, space.Windows, space.Monitor, marker)
	}
	return capability.Result{Text: strings.TrimRight(builder.String(), "\n")}, nil
}

func (c windowCapability) switchWorkspace(_ context.Context, arguments map[string]any) (capability.Result, error) {
	workspace := workspaceArg(arguments)
	if workspace == "" {
		return capability.Result{}, fmt.Errorf("workspace is required")
	}
	if err := c.service.hypr.Dispatch("workspace", workspace); err != nil {
		return capability.Result{}, fmt.Errorf("switch workspace: %w", err)
	}
	return capability.Result{Text: "Switched to workspace " + workspace + "."}, nil
}

func floatNote(floated bool) string {
	if floated {
		return " Floated it first, since pixel geometry does not apply to tiled windows."
	}
	return ""
}

func fullscreenWord(enabled bool) string {
	if enabled {
		return "fullscreen"
	}
	return "restored"
}
