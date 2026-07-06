// Package eventbus is neoshell's internal control-event distributor. External
// callers (the `neoshell emit` CLI, bound to Hyprland keys) send NDJSON events
// over a unix socket; the daemon decodes them and fans each one out to the Go
// subscribers registered on the Bus (voice pipeline, surface control).
//
// It is deliberately separate from server.Hub: the Hub fans WebSocket messages
// out to browser clients (with per-client bookkeeping and last-state hydration),
// whereas this Bus fans typed events out to in-process Go handlers.
package eventbus

import (
	"encoding/json"
	"sync"
)

// Event is one control message. On the wire it is a single newline-delimited
// JSON object, matching the searchd/renderhost socket conventions. Payload is
// optional and opaque to the Bus; each subscriber decodes it as needed.
type Event struct {
	Topic   string          `json:"topic"`
	Payload json.RawMessage `json:"payload,omitempty"`
}

// Handler consumes a published Event. Handlers run on their own goroutine, so a
// slow handler never stalls the socket read loop or its sibling handlers.
type Handler func(Event)

// Bus is an in-process topic pub/sub. Subscribe once at startup; Publish for
// every incoming event.
type Bus struct {
	mu   sync.RWMutex
	subs map[string][]Handler
}

func New() *Bus {
	return &Bus{subs: make(map[string][]Handler)}
}

// Subscribe registers handler for exact-match topic. Topics follow the
// object:verb convention (e.g. "voice:listen", "surface:toggle").
func (b *Bus) Subscribe(topic string, handler Handler) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.subs[topic] = append(b.subs[topic], handler)
}

// Publish delivers event to every handler subscribed to its topic. Each handler
// runs on its own goroutine; there is no ordering guarantee across handlers.
func (b *Bus) Publish(event Event) {
	b.mu.RLock()
	handlers := b.subs[event.Topic]
	b.mu.RUnlock()

	for _, handler := range handlers {
		go handler(event)
	}
}
