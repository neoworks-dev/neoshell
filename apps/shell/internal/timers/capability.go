package timers

import (
	"context"
	"fmt"
	"strings"

	"github.com/neoworks/neoshell/internal/capability"
)

// Capability exposes the timer service as named actions shared by the AI tool
// loop and the launcher, so both drive the exact same state through one path.
func (s *Service) Capability() capability.Capability {
	return timerCapability{service: s}
}

type timerCapability struct {
	service *Service
}

func (c timerCapability) ID() string { return "timer" }

func (c timerCapability) Actions() []capability.Action {
	return []capability.Action{
		{
			Name:        "timer:start",
			Description: "Start a countdown timer that fires a desktop notification when it expires.",
			Params: map[string]capability.ParamSpec{
				"seconds": {Type: "number", Description: "Duration in seconds.", Required: true},
				"label":   {Type: "string", Description: "What the timer is for.", Required: false},
			},
			Handler: c.startTimer,
		},
		{
			Name:        "timer:stop",
			Description: "Cancel a running countdown timer by its id.",
			Params: map[string]capability.ParamSpec{
				"id": {Type: "string", Description: "The timer id to cancel.", Required: true},
			},
			Handler: c.stopTimer,
		},
		{
			Name:        "timer:list",
			Description: "List the running countdown timers and active tracking sessions.",
			Params:      map[string]capability.ParamSpec{},
			Handler:     c.listTimers,
		},
		{
			Name:        "track:start",
			Description: "Start a labeled time-tracking session that records how long an activity takes.",
			Params: map[string]capability.ParamSpec{
				"label": {Type: "string", Description: "What is being tracked.", Required: true},
			},
			Handler: c.startTrack,
		},
		{
			Name:        "track:stop",
			Description: "Stop a running time-tracking session. Omit the id to stop the most recent one.",
			Params: map[string]capability.ParamSpec{
				"id": {Type: "string", Description: "The session id to stop; empty stops the latest.", Required: false},
			},
			Handler: c.stopTrack,
		},
	}
}

func (c timerCapability) startTimer(ctx context.Context, arguments map[string]any) (capability.Result, error) {
	seconds := intArg(arguments, "seconds")
	if seconds <= 0 {
		return capability.Result{}, fmt.Errorf("seconds must be a positive number")
	}
	label := stringArg(arguments, "label")
	c.service.StartTimer(label, seconds)
	return capability.Result{Text: "Started a " + humanDuration(seconds) + " timer."}, nil
}

func (c timerCapability) stopTimer(ctx context.Context, arguments map[string]any) (capability.Result, error) {
	id := stringArg(arguments, "id")
	if id == "" {
		return capability.Result{}, fmt.Errorf("id is required")
	}
	c.service.StopTimer(id)
	return capability.Result{Text: "Cancelled the timer."}, nil
}

func (c timerCapability) startTrack(ctx context.Context, arguments map[string]any) (capability.Result, error) {
	label := stringArg(arguments, "label")
	if label == "" {
		return capability.Result{}, fmt.Errorf("label is required")
	}
	c.service.StartTrack(label)
	return capability.Result{Text: "Tracking \"" + label + "\"."}, nil
}

func (c timerCapability) stopTrack(ctx context.Context, arguments map[string]any) (capability.Result, error) {
	c.service.StopTrack(stringArg(arguments, "id"))
	return capability.Result{Text: "Stopped tracking."}, nil
}

func (c timerCapability) listTimers(ctx context.Context, arguments map[string]any) (capability.Result, error) {
	state := c.service.Snapshot()
	if len(state.Timers) == 0 && len(state.Sessions) == 0 {
		return capability.Result{Text: "No running timers or tracking sessions."}, nil
	}

	var builder strings.Builder
	for _, timer := range state.Timers {
		remaining := int((timer.EndsAt - now()) / 1000)
		if remaining < 0 {
			remaining = 0
		}
		label := timer.Label
		if label == "" {
			label = "Timer"
		}
		fmt.Fprintf(&builder, "- %s: %s left (id %s)\n", label, humanDuration(remaining), timer.ID)
	}
	for _, session := range state.Sessions {
		if session.StoppedAt != 0 {
			continue
		}
		elapsed := int((now() - session.StartedAt) / 1000)
		fmt.Fprintf(&builder, "- tracking \"%s\": %s elapsed (id %s)\n", session.Label, humanDuration(elapsed), session.ID)
	}
	return capability.Result{Text: strings.TrimRight(builder.String(), "\n")}, nil
}

// humanDuration mirrors the launcher's formatting so the AI and the palette
// describe the same timer identically.
func humanDuration(seconds int) string {
	if seconds >= 3600 {
		return fmt.Sprintf("%dh %dm", seconds/3600, (seconds%3600)/60)
	}
	if seconds >= 60 {
		return fmt.Sprintf("%dm %ds", seconds/60, seconds%60)
	}
	return fmt.Sprintf("%ds", seconds)
}

func stringArg(arguments map[string]any, key string) string {
	value, ok := arguments[key].(string)
	if !ok {
		return ""
	}
	return value
}

// intArg reads a numeric argument, accepting the float64 that JSON decoding
// yields as well as an int or a numeric string.
func intArg(arguments map[string]any, key string) int {
	switch value := arguments[key].(type) {
	case float64:
		return int(value)
	case int:
		return value
	case string:
		var parsed int
		fmt.Sscanf(value, "%d", &parsed)
		return parsed
	}
	return 0
}
