package renderhost

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/neoworks/neobar/internal/ipc"
	"github.com/neoworks/neobar/internal/server"
)

// barRole is the single overlay surface that hosts the shell frontend. It spans
// the output; the frontend carves out interactive areas via window:region and
// reserves space via window:exclusive, exactly as in the WebKitGTK build.
const barRole = "bar"

// Controller spawns the render host and bridges hub window/region/exclusive
// commands to it. It replaces internal/bar in the Ultralight render path.
type Controller struct {
	hub     *server.Hub
	host    *Host
	client  *Client
	url     string
	monitor string
}

// Run spawns the render host, creates the bar surface, and forwards hub commands
// until the process exits. Blocks; run as the main render loop in Ultralight mode.
func Run(hub *server.Hub, url, monitor, binPath string) error {
	host, err := SpawnHost(binPath)
	if err != nil {
		return err
	}

	client, err := dialWithRetry(DefaultSocketPath(), 5*time.Second)
	if err != nil {
		host.Stop()
		return err
	}

	controller := &Controller{
		hub:     hub,
		host:    host,
		client:  client,
		url:     url,
		monitor: monitor,
	}
	defer controller.shutdown()

	if err := controller.createBar(); err != nil {
		return err
	}
	go controller.drainEvents()
	go controller.listen()

	// Block until interrupted, then the deferred shutdown kills the render host
	// group. Without this the process would run forever and Ctrl-C would never
	// reach shutdown, orphaning CEF.
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	sig := <-sigCh
	log.Printf("received %s, shutting down render host", sig)
	return nil
}

func (c *Controller) shutdown() {
	c.client.Close()
	c.host.Stop()
}

// createBar creates the fullscreen overlay surface and immediately makes it
// click-through; the frontend then defines its interactive regions.
func (c *Controller) createBar() error {
	spec := SurfaceSpec{
		Role:     barRole,
		URL:      c.url,
		Monitor:  c.monitor,
		// Top, not Overlay: a fullscreen window covers the Top layer but would
		// draw under an Overlay surface, so Overlay keeps the bar visible over
		// fullscreen apps. Top hides it there, which is what we want.
		Layer: LayerTop,
		// Top+left+right, not all four edges: wlroots ignores the exclusive zone
		// of a surface anchored to all four edges, so the frontend's
		// window:exclusive reservation would do nothing. Dropping the bottom
		// anchor still spans the screen (the render host sizes the height to the
		// output) while letting the top exclusive zone take effect.
		Anchors:  []Edge{EdgeTop, EdgeLeft, EdgeRight},
		Keyboard: KeyboardOnDemand,
	}
	if err := c.client.CreateSurface(spec); err != nil {
		return fmt.Errorf("create bar surface: %w", err)
	}
	// Empty region = whole overlay is click-through until the frontend sends
	// its interactive rects, so the desktop is not blocked during load.
	return c.client.SetInputRegion(barRole, nil)
}

// listen forwards hub window/region commands to the render host.
func (c *Controller) listen() {
	chWindow := c.hub.Subscribe("window")
	chRegion := c.hub.Subscribe("region")
	defer c.hub.Unsubscribe("window", chWindow)
	defer c.hub.Unsubscribe("region", chRegion)

	for {
		select {
		case msg := <-chWindow:
			c.handle(msg)
		case msg := <-chRegion:
			c.handle(msg)
		}
	}
}

func (c *Controller) handle(msg ipc.WindowCommand) {
	switch msg.Action {
	case "exclusive":
		edge := Edge(msg.Edge)
		if edge == "" {
			edge = EdgeTop
		}
		if err := c.client.SetExclusive(barRole, edge, msg.Size); err != nil {
			log.Printf("render host exclusive: %v", err)
		}
	case "region":
		if err := c.client.SetInputRegion(barRole, msg.Rects); err != nil {
			log.Printf("render host region: %v", err)
		}
	case "open", "close", "toggle":
		// No-op in the overlay model: the frontend drives input regions, so
		// panel open/close is expressed through window:region updates.
	default:
		log.Printf("render host: unhandled window action %q", msg.Action)
	}
}

// drainEvents logs render-host events (ready/log) so they are not lost.
func (c *Controller) drainEvents() {
	for event := range c.client.Events() {
		switch event.Event {
		case "ready":
			log.Printf("render host: surface %q ready", event.Role)
		case "log":
			log.Printf("render host [%s]: %s", event.Level, event.Msg)
		}
	}
}

// dialWithRetry connects to the control socket, retrying until the host has
// created it or the timeout elapses.
func dialWithRetry(socketPath string, timeout time.Duration) (*Client, error) {
	deadline := time.Now().Add(timeout)
	for {
		client, err := Dial(socketPath)
		if err == nil {
			return client, nil
		}
		if time.Now().After(deadline) {
			return nil, fmt.Errorf("connect render host within %s: %w", timeout, err)
		}
		time.Sleep(50 * time.Millisecond)
	}
}
