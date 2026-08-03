package windows

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/neoworks/neoshell/internal/hyprland"
)

// Arguments arrive loosely typed from JSON, so numbers are float64 and a model
// may well send "1200" where an integer was asked for. Coercing here keeps
// every handler free of the same three type switches.

func stringArg(arguments map[string]any, key string) string {
	value, ok := arguments[key].(string)
	if !ok {
		return ""
	}
	return strings.TrimSpace(value)
}

// intArg reports whether the key was present and numeric, so a handler can tell
// a missing coordinate from a deliberate zero.
func intArg(arguments map[string]any, key string) (int, bool) {
	switch value := arguments[key].(type) {
	case float64:
		return int(value), true
	case int:
		return value, true
	case string:
		parsed, err := strconv.Atoi(strings.TrimSpace(value))
		return parsed, err == nil
	}
	return 0, false
}

// workspaceArg accepts a workspace as either a name or a number, since JSON
// gives no way for the model to know which one Hyprland wants.
func workspaceArg(arguments map[string]any) string {
	if name := stringArg(arguments, "workspace"); name != "" {
		return name
	}
	if id, ok := intArg(arguments, "workspace"); ok {
		return strconv.Itoa(id)
	}
	return ""
}

// label names a window the way a person would, for confirmation text.
func label(window hyprland.Window) string {
	switch {
	case window.Class != "" && window.Title != "":
		return fmt.Sprintf("%s (%s)", window.Class, truncate(window.Title, 40))
	case window.Class != "":
		return window.Class
	case window.Title != "":
		return truncate(window.Title, 40)
	default:
		return window.Address
	}
}
