package overlay

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/neoworks/neoshell/internal/capability"
	"github.com/neoworks/neoshell/internal/notifications"
)

// defaultToastMs is how long a transient toast stays up when the caller does
// not say. Long enough to read a sentence, short enough not to sit in the way.
const defaultToastMs = 4000

func (s *Service) Capability() capability.Capability {
	return overlayCapability{service: s}
}

type overlayCapability struct {
	service *Service
}

func (c overlayCapability) ID() string { return "overlay" }

func (c overlayCapability) Actions() []capability.Action {
	return []capability.Action{
		{
			Name:        "overlay:notify",
			Description: "Raise a desktop notification. Use for anything the user should still see after looking away.",
			Params: map[string]capability.ParamSpec{
				"summary": {Type: "string", Description: "Short headline.", Required: true},
				"body":    {Type: "string", Description: "Longer detail.", Required: false},
				"urgency": {Type: "string", Description: "low, normal, or critical. Defaults to normal.", Required: false},
			},
			Policy:  capability.PolicyAllow,
			Handler: c.notify,
		},
		{
			Name:        "overlay:toast",
			Description: "Show a brief message in the bar that fades on its own. Use for confirmations that do not need to persist.",
			Params: map[string]capability.ParamSpec{
				"text": {Type: "string", Description: "The message.", Required: true},
				"tone": {Type: "string", Description: "info, success, warning, or error. Defaults to info.", Required: false},
				"ms":   {Type: "integer", Description: "How long to show it, in milliseconds.", Required: false},
			},
			Policy:  capability.PolicyAllow,
			Handler: c.toast,
		},
		{
			Name:        "overlay:surface",
			Description: "Open, close, or toggle one of the shell's surfaces, such as the spotlight launcher.",
			Params: map[string]capability.ParamSpec{
				"class":  {Type: "string", Description: "Surface class, e.g. spotlight.", Required: true},
				"action": {Type: "string", Description: "open, close, or toggle. Defaults to toggle.", Required: false},
			},
			Handler: c.surface,
		},
	}
}

func (c overlayCapability) notify(_ context.Context, arguments map[string]any) (capability.Result, error) {
	summary := stringArg(arguments, "summary")
	if summary == "" {
		return capability.Result{}, fmt.Errorf("summary is required")
	}
	body := stringArg(arguments, "body")

	if c.service.notifier == nil {
		// No session bus. A toast is the honest fallback: the user still sees
		// the message, and the result says it was not a real notification.
		c.service.emit("agent:toast", map[string]any{
			"text": strings.TrimSpace(summary + " " + body),
			"tone": "info",
			"ms":   defaultToastMs,
		})
		return capability.Result{Text: "Showed it as a toast; the notification daemon is unavailable."}, nil
	}

	c.service.notifier.Post(notifications.Notification{
		AppName: "neoshell",
		Summary: summary,
		Body:    body,
		Urgency: urgencyLevel(stringArg(arguments, "urgency")),
		Timeout: -1,
	})
	return capability.Result{Text: "Notified: " + summary}, nil
}

func (c overlayCapability) toast(_ context.Context, arguments map[string]any) (capability.Result, error) {
	text := stringArg(arguments, "text")
	if text == "" {
		return capability.Result{}, fmt.Errorf("text is required")
	}
	ms, ok := intArg(arguments, "ms")
	if !ok || ms <= 0 {
		ms = defaultToastMs
	}
	c.service.emit("agent:toast", map[string]any{
		"text": text,
		"tone": tone(stringArg(arguments, "tone")),
		"ms":   ms,
	})
	return capability.Result{Text: "Shown."}, nil
}

func (c overlayCapability) surface(_ context.Context, arguments map[string]any) (capability.Result, error) {
	class := stringArg(arguments, "class")
	if class == "" {
		return capability.Result{}, fmt.Errorf("class is required")
	}
	action := strings.ToLower(stringArg(arguments, "action"))
	switch action {
	case "":
		action = "toggle"
	case "open", "close", "toggle":
	default:
		return capability.Result{}, fmt.Errorf("action must be open, close, or toggle")
	}
	// The topic is "surface:toggle" for all three; the action rides in the
	// payload. That is the shape every surface already listens for.
	c.service.emit("surface:toggle", map[string]any{"class": class, "action": action})
	return capability.Result{Text: fmt.Sprintf("Sent %s to the %s surface.", action, class)}, nil
}

func (s *Service) emit(topic string, data any) {
	if s.broadcast == nil {
		return
	}
	s.broadcast(topic, data)
}

func urgencyLevel(value string) int {
	switch strings.ToLower(value) {
	case "low":
		return 0
	case "critical":
		return 2
	default:
		return 1
	}
}

func tone(value string) string {
	switch strings.ToLower(value) {
	case "success", "warning", "error":
		return strings.ToLower(value)
	default:
		return "info"
	}
}

func stringArg(arguments map[string]any, key string) string {
	value, ok := arguments[key].(string)
	if !ok {
		return ""
	}
	return strings.TrimSpace(value)
}

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
