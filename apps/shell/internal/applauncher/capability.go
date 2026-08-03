package applauncher

import (
	"context"
	"fmt"
	"path/filepath"
	"sort"
	"strings"

	"github.com/neoworks/neoshell/internal/apps"
	"github.com/neoworks/neoshell/internal/capability"
)

func (s *Service) Capability() capability.Capability {
	return appCapability{}
}

type appCapability struct{}

func (c appCapability) ID() string { return "apps" }

func (c appCapability) Actions() []capability.Action {
	return []capability.Action{
		{
			Name:        "apps:list",
			Description: "List installed applications, optionally filtered by name. Use this to find the exact name before launching.",
			Params: map[string]capability.ParamSpec{
				"query": {Type: "string", Description: "Filter by name; empty lists everything.", Required: false},
			},
			Policy:  capability.PolicyAllow,
			Handler: c.list,
		},
		{
			Name:        "apps:launch",
			Description: "Launch an installed application by name. Only starts applications that already have a desktop entry.",
			Params: map[string]capability.ParamSpec{
				"app":  {Type: "string", Description: "Application name, desktop id, or window class.", Required: true},
				"args": {Type: "string", Description: "Extra arguments appended to the launch command.", Required: false},
			},
			Handler: c.launch,
		},
		{
			Name:        "apps:run",
			Description: "Run an arbitrary shell command detached. Prefer apps:launch for starting applications; this grants full shell access.",
			Params: map[string]capability.ParamSpec{
				"command": {Type: "string", Description: "The shell command to run.", Required: true},
			},
			Handler: c.run,
		},
		{
			Name:        "files:open",
			Description: "Open a file or URL in the user's default application.",
			Params: map[string]capability.ParamSpec{
				"path": {Type: "string", Description: "Absolute file path or URL.", Required: true},
			},
			Handler: c.open,
		},
	}
}

// listLimit bounds apps:list so a machine with hundreds of desktop entries does
// not spend the agent's whole context on a directory listing.
const listLimit = 60

func (c appCapability) list(_ context.Context, arguments map[string]any) (capability.Result, error) {
	query := strings.ToLower(strings.TrimSpace(stringArg(arguments, "query")))
	var names []string
	for _, app := range apps.List() {
		if query != "" && classify(query, app.ID, app.Name, app.WMClass) == matchNone {
			continue
		}
		names = append(names, app.Name)
	}
	if len(names) == 0 {
		if query == "" {
			return capability.Result{Text: "No applications found."}, nil
		}
		return capability.Result{Text: "No applications match " + query + "."}, nil
	}
	sort.Strings(names)
	truncated := len(names) > listLimit
	if truncated {
		names = names[:listLimit]
	}
	text := "- " + strings.Join(names, "\n- ")
	if truncated {
		text += fmt.Sprintf("\n(showing the first %d; narrow the query for the rest)", listLimit)
	}
	return capability.Result{Text: text}, nil
}

func (c appCapability) launch(_ context.Context, arguments map[string]any) (capability.Result, error) {
	app, err := resolve(stringArg(arguments, "app"))
	if err != nil {
		return capability.Result{}, err
	}
	command := app.Exec
	if command == "" {
		return capability.Result{}, fmt.Errorf("%s has no launch command", app.Name)
	}
	if extra := stringArg(arguments, "args"); extra != "" {
		command += " " + extra
	}
	if err := apps.Launch(command); err != nil {
		return capability.Result{}, fmt.Errorf("launch %s: %w", app.Name, err)
	}
	return capability.Result{Text: "Launched " + app.Name + "."}, nil
}

func (c appCapability) run(_ context.Context, arguments map[string]any) (capability.Result, error) {
	command := stringArg(arguments, "command")
	if command == "" {
		return capability.Result{}, fmt.Errorf("command is required")
	}
	if err := apps.Launch(command); err != nil {
		return capability.Result{}, fmt.Errorf("run %q: %w", command, err)
	}
	return capability.Result{Text: "Ran: " + command}, nil
}

func (c appCapability) open(_ context.Context, arguments map[string]any) (capability.Result, error) {
	path := stringArg(arguments, "path")
	if path == "" {
		return capability.Result{}, fmt.Errorf("path is required")
	}
	if err := apps.Launch("xdg-open " + shellQuote(path)); err != nil {
		return capability.Result{}, fmt.Errorf("open %s: %w", path, err)
	}
	return capability.Result{
		Text:    "Opened " + path,
		Sources: []capability.Source{{Path: path, Name: filepath.Base(path)}},
	}, nil
}

func stringArg(arguments map[string]any, key string) string {
	value, ok := arguments[key].(string)
	if !ok {
		return ""
	}
	return strings.TrimSpace(value)
}
