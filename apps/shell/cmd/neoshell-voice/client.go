package main

import (
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// coreClient is the voice daemon's connection to the neoshell core. It carries
// three things over the one WebSocket: outbound voice:* state relayed to the
// frontend, inbound voice:control commands (keybinds), and request/response AI
// turns (agent:voice:*) to the shared agent session. The connection
// auto-reconnects; agent
// calls in flight during a drop resolve with an error so a turn aborts cleanly.
type coreClient struct {
	url string

	connMu sync.Mutex
	conn   *websocket.Conn

	mu      sync.Mutex
	pending map[string]chan aiEvent
	seq     int

	// onControl handles an inbound voice:control action ("listen"|"stop"|"cancel").
	onControl func(action string)
}

// aiEvent is one streamed message for an in-flight agent turn.
type aiEvent struct {
	kind   string // "token" | "status" | "done"
	token  string
	status string
	done   map[string]any
}

func newCoreClient(url string) *coreClient {
	return &coreClient{url: url, pending: make(map[string]chan aiEvent)}
}

// run dials the core and reads until the connection drops, then retries. It
// blocks for the daemon's lifetime.
func (c *coreClient) run() {
	for {
		conn, _, err := websocket.DefaultDialer.Dial(c.url, nil)
		if err != nil {
			log.Printf("voice: core connect failed (%v); retrying", err)
			time.Sleep(2 * time.Second)
			continue
		}
		c.setConn(conn)
		log.Printf("voice: connected to core at %s", c.url)
		c.subscribe("voice:control")
		c.readLoop(conn)

		c.setConn(nil)
		c.failPending()
		log.Printf("voice: core connection lost; reconnecting")
		time.Sleep(2 * time.Second)
	}
}

func (c *coreClient) setConn(conn *websocket.Conn) {
	c.connMu.Lock()
	if c.conn != nil && c.conn != conn {
		c.conn.Close()
	}
	c.conn = conn
	c.connMu.Unlock()
}

// send writes a JSON message to the core. Returns an error when disconnected.
func (c *coreClient) send(v any) error {
	c.connMu.Lock()
	defer c.connMu.Unlock()
	if c.conn == nil {
		return fmt.Errorf("not connected to core")
	}
	return c.conn.WriteJSON(v)
}

func (c *coreClient) subscribe(topic string) {
	_ = c.send(map[string]any{"type": "subscribe", "to": topic})
}

// relay pushes a voice:* payload through the core to every frontend subscriber.
func (c *coreClient) relay(topic string, data any) {
	raw, err := json.Marshal(data)
	if err != nil {
		return
	}
	_ = c.send(map[string]any{"type": "relay", "topic": topic, "data": json.RawMessage(raw)})
}

// readLoop dispatches inbound frames until the socket errors.
func (c *coreClient) readLoop(conn *websocket.Conn) {
	for {
		_, raw, err := conn.ReadMessage()
		if err != nil {
			return
		}
		var msg struct {
			Type string          `json:"type"`
			Data json.RawMessage `json:"data"`
		}
		if json.Unmarshal(raw, &msg) != nil {
			continue
		}
		c.dispatch(msg.Type, msg.Data)
	}
}

func (c *coreClient) dispatch(kind string, data json.RawMessage) {
	switch kind {
	case "voice:control":
		var payload struct {
			Action string `json:"action"`
		}
		if json.Unmarshal(data, &payload) == nil && c.onControl != nil {
			c.onControl(payload.Action)
		}
	case "agent:voice:token":
		var payload struct {
			ID    string `json:"id"`
			Token string `json:"token"`
		}
		if json.Unmarshal(data, &payload) == nil {
			c.deliver(payload.ID, aiEvent{kind: "token", token: payload.Token})
		}
	case "agent:voice:status":
		var payload struct {
			ID     string `json:"id"`
			Status string `json:"status"`
		}
		if json.Unmarshal(data, &payload) == nil {
			c.deliver(payload.ID, aiEvent{kind: "status", status: payload.Status})
		}
	case "agent:voice:done":
		var payload map[string]any
		if json.Unmarshal(data, &payload) == nil {
			id, _ := payload["id"].(string)
			c.deliver(id, aiEvent{kind: "done", done: payload})
		}
	}
}

// agentRequest starts an agent turn and returns a channel of its streamed
// events. The caller must drain until a "done" event, then call finishAgent(id).
//
// kind is "ask" for a real turn or "addressed" for the addressivity gate.
func (c *coreClient) agentRequest(kind, prompt string) (string, <-chan aiEvent, error) {
	c.mu.Lock()
	c.seq++
	id := fmt.Sprintf("v%d", c.seq)
	ch := make(chan aiEvent, 512)
	c.pending[id] = ch
	c.mu.Unlock()

	if err := c.send(map[string]any{"type": "agent:voice:" + kind, "id": id, "prompt": prompt}); err != nil {
		c.finishAgent(id)
		return "", nil, err
	}
	return id, ch, nil
}

func (c *coreClient) cancelAgent(id string) {
	_ = c.send(map[string]any{"type": "agent:voice:cancel", "id": id})
}

func (c *coreClient) finishAgent(id string) {
	c.mu.Lock()
	if ch, ok := c.pending[id]; ok {
		delete(c.pending, id)
		close(ch)
	}
	c.mu.Unlock()
}

// deliver routes one event to its request channel. The send is held under mu and
// non-blocking, so it can never stall the read loop and can never race a
// concurrent finishAI/failPending close of the same channel.
func (c *coreClient) deliver(id string, ev aiEvent) {
	c.mu.Lock()
	defer c.mu.Unlock()
	ch, ok := c.pending[id]
	if !ok {
		return
	}
	select {
	case ch <- ev:
	default:
		// Buffer full (a stalled consumer): drop rather than block the read loop.
	}
}

// failPending resolves every in-flight agent request with a synthetic error done so
// blocked Responder calls return instead of hanging after a disconnect.
func (c *coreClient) failPending() {
	c.mu.Lock()
	pending := c.pending
	c.pending = make(map[string]chan aiEvent)
	c.mu.Unlock()
	for _, ch := range pending {
		ch <- aiEvent{kind: "done", done: map[string]any{"error": "core disconnected"}}
		close(ch)
	}
}
