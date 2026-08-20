package server

import (
	"encoding/json"
	"sync"

	"github.com/neoworks/neoshell/internal/ipc"
)

// OutMessage is sent to WebSocket clients.
type OutMessage struct {
	Type string `json:"type"`
	Data any    `json:"data"`
}

// InMessage is received from WebSocket clients.
type InMessage struct {
	Type string `json:"type"`

	// subscribe / unsubscribe
	To string `json:"to,omitempty"`

	// run / watch
	ID  string `json:"id,omitempty"`
	Cmd string `json:"cmd,omitempty"`

	// hyprland:dispatch
	Dispatcher string `json:"dispatcher,omitempty"`
	Arg        string `json:"arg,omitempty"`

	// window management
	Action string     `json:"action,omitempty"`
	Name   string     `json:"name,omitempty"`
	Rects  []ipc.Rect `json:"rects,omitempty"`

	// window:exclusive — frontend-driven exclusive zone reservation.
	// Edge is one of "top", "bottom", "left", "right".
	Edge string `json:"edge,omitempty"`
	Size int    `json:"size,omitempty"`

	// surface:keyboard — runtime keyboard interactivity ("none"|"ondemand"|"exclusive").
	Mode string `json:"mode,omitempty"`

	// relay — generic surface-to-surface pub/sub: the server rebroadcasts Data on
	// Topic to every subscriber, so one webview can push state to another.
	Topic string          `json:"topic,omitempty"`
	Data  json.RawMessage `json:"data,omitempty"`

	// config:set — dotted key and its new JSON value.
	Key   string          `json:"key,omitempty"`
	Value json.RawMessage `json:"value,omitempty"`

	// notification:action / notification:close
	NotifID   uint32 `json:"notifId,omitempty"`
	ActionKey string `json:"actionKey,omitempty"`
	Reason    int    `json:"reason,omitempty"`

	// timer:start / track:start
	Label    string `json:"label,omitempty"`
	Duration int    `json:"duration,omitempty"` // seconds (timer countdown)

	// surface:drag-start — local file paths to drag out to other apps.
	Paths []string `json:"paths,omitempty"`
}

// Hub manages WebSocket clients and topic subscriptions.
type Hub struct {
	mu         sync.RWMutex
	clients    map[*Client]bool
	topics     map[string]map[*Client]bool
	lastState  map[string][]byte // cache last broadcast per topic for hydration
	windowCmds map[string][]chan ipc.WindowCommand
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		topics:     make(map[string]map[*Client]bool),
		lastState:  make(map[string][]byte),
		windowCmds: make(map[string][]chan ipc.WindowCommand),
	}
}

func (h *Hub) Run() {
	// hub is lock-based, no goroutine needed — but kept for future use
}

func (h *Hub) Register(c *Client) {
	h.mu.Lock()
	h.clients[c] = true
	h.mu.Unlock()
}

func (h *Hub) Unregister(c *Client) {
	h.mu.Lock()
	delete(h.clients, c)
	for _, subs := range h.topics {
		delete(subs, c)
	}
	h.mu.Unlock()
}

func (h *Hub) SendRegionUpdate(name string, rects []ipc.Rect) {
	h.mu.RLock()
	chans := h.windowCmds["region"]
	h.mu.RUnlock()
	for _, ch := range chans {
		ch <- ipc.WindowCommand{Action: "region", Name: name, Rects: rects}
	}
}

func (h *Hub) SubscribeClient(c *Client, topic string) {
	h.mu.Lock()
	if h.topics[topic] == nil {
		h.topics[topic] = make(map[*Client]bool)
	}
	h.topics[topic][c] = true

	// immediately send cached state if available
	cached := h.lastState[topic]
	h.mu.Unlock()

	if cached != nil {
		c.Send(cached)
	}
}

func (h *Hub) UnsubscribeClient(c *Client, topic string) {
	h.mu.Lock()
	if subs := h.topics[topic]; subs != nil {
		delete(subs, c)
	}
	h.mu.Unlock()
}

// Broadcast sends data to all clients subscribed to a topic and caches it, so a
// surface that subscribes later hydrates immediately with current state.
func (h *Hub) Broadcast(topic string, data any) {
	h.publish(topic, data, true)
}

// BroadcastEphemeral sends data without caching it. Use it for anything that is
// an increment rather than a state: replaying one streamed token to a surface
// that connected afterwards is worse than sending it nothing at all.
func (h *Hub) BroadcastEphemeral(topic string, data any) {
	h.publish(topic, data, false)
}

func (h *Hub) publish(topic string, data any, remember bool) {
	msg := OutMessage{Type: topic, Data: data}
	raw, err := json.Marshal(msg)
	if err != nil {
		return
	}

	h.mu.Lock()
	if remember {
		h.lastState[topic] = raw
	}
	subs := h.topics[topic]
	var targets []*Client
	for c := range subs {
		targets = append(targets, c)
	}
	h.mu.Unlock()

	for _, c := range targets {
		c.Send(raw)
	}
}

// Subscribe returns a channel that receives WindowCommands for a named window.
// Used by the bar package to listen for open/close/toggle.
func (h *Hub) Subscribe(name string) chan ipc.WindowCommand {
	ch := make(chan ipc.WindowCommand, 8)
	h.mu.Lock()
	h.windowCmds[name] = append(h.windowCmds[name], ch)
	h.mu.Unlock()
	return ch
}

func (h *Hub) Unsubscribe(name string, ch chan ipc.WindowCommand) {
	h.mu.Lock()
	chans := h.windowCmds[name]
	for i, c := range chans {
		if c == ch {
			h.windowCmds[name] = append(chans[:i], chans[i+1:]...)
			break
		}
	}
	h.mu.Unlock()
	close(ch)
}

func (h *Hub) SendWindowCommand(name, action string) {
	// Routed through the shared "window" channel (like exclusive/region) carrying
	// the target name, so the render controller can open/close named windows such
	// as "settings".
	h.mu.RLock()
	chans := h.windowCmds["window"]
	h.mu.RUnlock()
	cmd := ipc.WindowCommand{Action: action, Name: name}
	for _, ch := range chans {
		ch <- cmd
	}
}

// SendDragStart asks the render host to begin a shell-initiated drag carrying
// the given local file paths. Routed through the "window" channel.
func (h *Hub) SendDragStart(paths []string) {
	h.mu.RLock()
	chans := h.windowCmds["window"]
	h.mu.RUnlock()
	cmd := ipc.WindowCommand{Action: "dragstart", Paths: paths}
	for _, ch := range chans {
		ch <- cmd
	}
}

// SendKeyboardMode changes the named surface's keyboard interactivity at runtime
// ("none" | "ondemand" | "exclusive"). Routed through the "window" channel.
func (h *Hub) SendKeyboardMode(name, mode string) {
	h.mu.RLock()
	chans := h.windowCmds["window"]
	h.mu.RUnlock()
	cmd := ipc.WindowCommand{Action: "keyboard", Name: name, Mode: mode}
	for _, ch := range chans {
		ch <- cmd
	}
}

// SendExclusiveZone tells the named window to reserve `size` pixels along `edge`.
// A size of 0 clears the reservation. Routed through the "window" channel.
func (h *Hub) SendExclusiveZone(name, edge string, size int) {
	h.mu.RLock()
	chans := h.windowCmds["window"]
	h.mu.RUnlock()
	cmd := ipc.WindowCommand{Action: "exclusive", Name: name, Edge: edge, Size: size}
	for _, ch := range chans {
		ch <- cmd
	}
}
