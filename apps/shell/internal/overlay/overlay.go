// Package overlay exposes the shell's own attention-getting surfaces —
// notifications, transient toasts, and surface visibility — as capability
// actions, so an agent can report a result on screen instead of only in text.
package overlay

import (
	"github.com/neoworks/neoshell/internal/notifications"
)

// Broadcaster publishes on a hub topic. Injected so this package does not
// depend on the server.
type Broadcaster func(topic string, data any)

// Notifier raises a desktop notification. It is the notification daemon in
// practice and nil when the session bus was unavailable, in which case
// overlay:notify degrades to a toast rather than failing.
type Notifier interface {
	Post(notifications.Notification) uint32
}

type Service struct {
	broadcast Broadcaster
	notifier  Notifier
}

func New(broadcast Broadcaster, notifier Notifier) *Service {
	// A nil interface value held in a non-nil interface would still satisfy the
	// nil check below, so normalise the typed-nil case at construction.
	if daemon, ok := notifier.(*notifications.Daemon); ok && daemon == nil {
		notifier = nil
	}
	return &Service{broadcast: broadcast, notifier: notifier}
}
