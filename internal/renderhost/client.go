// Package renderhost drives the external Ultralight render host over a unix
// socket. It is the Go side of the control protocol defined in
// render-host/src/protocol.rs — keep the two in sync (see MIGRATION.md).
//
// The render host owns the wlr-layer-shell surfaces and paints HTML views into
// them. This package replaces the in-process gotk4-webkitgtk surface management
// in internal/bar once the migration reaches stage 6.
package renderhost

import (
	"bufio"
	"encoding/json"
	"fmt"
	"net"
	"os"
	"sync"

	"github.com/neoworks/neobar/internal/ipc"
)

// Layer mirrors zwlr_layer_shell_v1 layers.
type Layer string

const (
	LayerBackground Layer = "background"
	LayerBottom     Layer = "bottom"
	LayerTop        Layer = "top"
	LayerOverlay    Layer = "overlay"
)

// Edge is a screen edge for anchors and exclusive-zone reservation.
type Edge string

const (
	EdgeTop    Edge = "top"
	EdgeBottom Edge = "bottom"
	EdgeLeft   Edge = "left"
	EdgeRight  Edge = "right"
)

// Keyboard mirrors the layer-shell keyboard-interactivity modes.
type Keyboard string

const (
	KeyboardNone      Keyboard = "none"
	KeyboardOnDemand  Keyboard = "ondemand"
	KeyboardExclusive Keyboard = "exclusive"
)

// SurfaceSpec describes a layer-shell surface to create.
type SurfaceSpec struct {
	Role          string   `json:"role"`
	URL           string   `json:"url"`
	Monitor       string   `json:"monitor,omitempty"`
	Layer         Layer    `json:"layer"`
	Anchors       []Edge   `json:"anchors"`
	Keyboard      Keyboard `json:"keyboard"`
	ExclusiveEdge *Edge    `json:"exclusive_edge,omitempty"`
	ExclusiveSize int      `json:"exclusive_size,omitempty"`
}

// Event is a message from the render host to the core.
type Event struct {
	Event string `json:"event"`
	Role  string `json:"role,omitempty"`
	Level string `json:"level,omitempty"`
	Msg   string `json:"msg,omitempty"`
}

// Client is a connection to the render host control socket.
type Client struct {
	conn   net.Conn
	mu     sync.Mutex // serializes writes
	events chan Event
}

// DefaultSocketPath returns the control socket path under XDG_RUNTIME_DIR.
func DefaultSocketPath() string {
	runtime := os.Getenv("XDG_RUNTIME_DIR")
	if runtime == "" {
		runtime = fmt.Sprintf("/run/user/%d", os.Getuid())
	}
	return runtime + "/neobar-render.sock"
}

// Dial connects to the render host at the given socket path and starts reading
// events. Close the returned Client to release the connection.
func Dial(socketPath string) (*Client, error) {
	conn, err := net.Dial("unix", socketPath)
	if err != nil {
		return nil, fmt.Errorf("dial render host: %w", err)
	}

	client := &Client{conn: conn, events: make(chan Event, 16)}
	go client.readEvents()
	return client, nil
}

// Events returns the channel of events emitted by the render host.
func (c *Client) Events() <-chan Event {
	return c.events
}

func (c *Client) readEvents() {
	defer close(c.events)
	scanner := bufio.NewScanner(c.conn)
	for scanner.Scan() {
		var event Event
		if err := json.Unmarshal(scanner.Bytes(), &event); err != nil {
			continue
		}
		c.events <- event
	}
	if err := scanner.Err(); err != nil {
		fmt.Fprintf(os.Stderr, "render host event stream closed: %v\n", err)
	}
}

// send marshals a command map (which must carry a "cmd" field) and writes it as
// one newline-delimited JSON line.
func (c *Client) send(command map[string]any) error {
	raw, err := json.Marshal(command)
	if err != nil {
		return err
	}
	raw = append(raw, '\n')

	c.mu.Lock()
	defer c.mu.Unlock()
	_, err = c.conn.Write(raw)
	return err
}

// CreateSurface creates a layer-shell surface running an Ultralight view.
func (c *Client) CreateSurface(spec SurfaceSpec) error {
	command := map[string]any{
		"cmd":      "surface.create",
		"role":     spec.Role,
		"url":      spec.URL,
		"monitor":  spec.Monitor,
		"layer":    spec.Layer,
		"anchors":  spec.Anchors,
		"keyboard": spec.Keyboard,
	}
	if spec.ExclusiveEdge != nil {
		command["exclusive_edge"] = *spec.ExclusiveEdge
		command["exclusive_size"] = spec.ExclusiveSize
	}
	return c.send(command)
}

// SetExclusive reserves size pixels along edge for the surface (0 clears it).
func (c *Client) SetExclusive(role string, edge Edge, size int) error {
	return c.send(map[string]any{
		"cmd":  "surface.exclusive",
		"role": role,
		"edge": edge,
		"size": size,
	})
}

// SetInputRegion restricts input to the given rectangles; outside is
// click-through. Empty rects = whole surface click-through.
func (c *Client) SetInputRegion(role string, rects []ipc.Rect) error {
	// Marshal nil as [] rather than null so the host's Vec<Rect> deserializes.
	if rects == nil {
		rects = []ipc.Rect{}
	}
	return c.send(map[string]any{
		"cmd":   "surface.region",
		"role":  role,
		"rects": rects,
	})
}

// Show maps a previously hidden surface.
func (c *Client) Show(role string) error {
	return c.send(map[string]any{"cmd": "surface.show", "role": role})
}

// Hide unmaps a surface without destroying it.
func (c *Client) Hide(role string) error {
	return c.send(map[string]any{"cmd": "surface.hide", "role": role})
}

// Destroy tears down a surface.
func (c *Client) Destroy(role string) error {
	return c.send(map[string]any{"cmd": "surface.destroy", "role": role})
}

// Close releases the connection.
func (c *Client) Close() error {
	return c.conn.Close()
}
