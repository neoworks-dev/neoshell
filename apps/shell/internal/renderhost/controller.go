package renderhost

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/neoworks/neoshell/internal/ipc"
	"github.com/neoworks/neoshell/internal/plugins"
	"github.com/neoworks/neoshell/internal/server"
)

// barRole is the default surface role: window commands with an empty name target
// it, and it is the frontend's default view.
const barRole = "bar"

// settingsRole names the standalone settings application. It is not a shell
// surface — window:open/close spawn and kill the separate neoshell-settings
// process, which hosts the settings UI in its own window over the WS bus.
const settingsRole = "settings"

// surfaceRole maps a frontend-supplied window name to a shell surface role,
// defaulting to the bar when the name is empty.
func surfaceRole(name string) string {
	if name == "" {
		return barRole
	}
	return name
}

// Controller spawns the render host and bridges hub window/region/exclusive
// commands to it. It drives the WPE WebKit render host (apps/render-host).
type Controller struct {
	hub     *server.Hub
	host    *Host
	client  *Client
	url     string
	monitor string

	// surfaces maps a role to its resolved plugin surface, for toggle lookups.
	surfaces map[string]plugins.ResolvedSurface

	mu          sync.Mutex
	settingsCmd *exec.Cmd       // the running settings app, if any
	openState   map[string]bool // whether each toggleable surface is currently mapped
}

// Run spawns the render host, creates every plugin surface, and forwards hub
// commands until the process exits. Blocks; run as the main render loop. When
// surfaces is empty it falls back to the built-in shell surfaces.
func Run(hub *server.Hub, url, monitor, binPath string, surfaces []plugins.ResolvedSurface) error {
	if len(surfaces) == 0 {
		surfaces = defaultSurfaces()
	}

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
		hub:       hub,
		host:      host,
		client:    client,
		url:       url,
		monitor:   monitor,
		surfaces:  make(map[string]plugins.ResolvedSurface, len(surfaces)),
		openState: make(map[string]bool),
	}
	defer controller.shutdown()

	for _, resolved := range surfaces {
		controller.surfaces[resolved.View] = resolved
		if err := controller.createSurface(resolved); err != nil {
			return err
		}
	}
	go controller.drainEvents()
	go controller.listen()

	// Block until interrupted, then the deferred shutdown kills the render host
	// group. Without this the process would run forever and Ctrl-C would never
	// reach shutdown, orphaning the render host.
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	sig := <-sigCh
	log.Printf("received %s, shutting down render host", sig)
	return nil
}

func (c *Controller) shutdown() {
	c.closeWindow(settingsRole)
	c.client.Close()
	c.host.Stop()
}

// createSurface creates one layer-shell surface from its plugin spec. Every
// surface starts click-through (empty input region) so the desktop is not
// blocked during load; the frontend then defines its interactive regions.
func (c *Controller) createSurface(surface plugins.ResolvedSurface) error {
	spec := SurfaceSpec{
		Role:     surface.View,
		URL:      c.surfaceURL(surface),
		Monitor:  c.monitor,
		Layer:    Layer(surface.Layer),
		Anchors:  toEdges(surface.Anchors),
		Keyboard: Keyboard(surface.Keyboard),
	}
	if surface.ExclusiveEdge != "" {
		edge := Edge(surface.ExclusiveEdge)
		spec.ExclusiveEdge = &edge
		spec.ExclusiveSize = surface.ExclusiveSize
	}

	if err := c.client.CreateSurface(spec); err != nil {
		return fmt.Errorf("create %s surface: %w", surface.View, err)
	}
	if err := c.client.SetInputRegion(surface.View, nil); err != nil {
		return err
	}
	if surface.StartHidden {
		c.setSurface(surface.View, false)
	}
	return nil
}

// surfaceURL is the page a surface loads: its plugin entry at /plugins/<id>/,
// served by the Go core (prod) or the dev-Vite aggregator. c.url already ends
// with ?port=N (the WS port), which the plugin page needs, so the query is
// carried onto the plugin path.
func (c *Controller) surfaceURL(surface plugins.ResolvedSurface) string {
	origin, query := c.url, ""
	if i := strings.IndexByte(c.url, '?'); i >= 0 {
		origin, query = c.url[:i], c.url[i:]
	}
	return origin + "/plugins/" + surface.PluginID + "/" + query
}

// toEdges converts manifest anchor strings to render-host edges.
func toEdges(anchors []string) []Edge {
	edges := make([]Edge, 0, len(anchors))
	for _, anchor := range anchors {
		edges = append(edges, Edge(anchor))
	}
	return edges
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
		role := surfaceRole(msg.Name)
		edge := Edge(msg.Edge)
		if edge == "" {
			edge = EdgeTop
		}
		if err := c.client.SetExclusive(role, edge, msg.Size); err != nil {
			log.Printf("render host exclusive: %v", err)
		}
	case "region":
		role := surfaceRole(msg.Name)
		if err := c.client.SetInputRegion(role, msg.Rects); err != nil {
			log.Printf("render host region: %v", err)
		}
	case "keyboard":
		role := surfaceRole(msg.Name)
		mode := msg.Mode
		if mode == "" {
			mode = "none"
		}
		if err := c.client.SetKeyboard(role, mode); err != nil {
			log.Printf("render host keyboard: %v", err)
		}
	case "dragstart":
		if err := c.client.StartDrag(msg.Paths); err != nil {
			log.Printf("render host start drag: %v", err)
		}
	case "open":
		c.openWindow(msg.Name)
	case "close":
		c.closeWindow(msg.Name)
	case "toggle":
		if c.isOpen(msg.Name) {
			c.closeWindow(msg.Name)
		} else {
			c.openWindow(msg.Name)
		}
	default:
		log.Printf("render host: unhandled window action %q", msg.Action)
	}
}

func (c *Controller) isOpen(name string) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	if name == settingsRole {
		return c.settingsCmd != nil
	}
	return c.openState[name]
}

// openWindow maps a toggleable surface or launches a shell application. Settings
// is a separate process (neoshell-settings) that hosts its UI in its own window
// and talks to the Go core over the WS bus — it is not a shell surface.
func (c *Controller) openWindow(name string) {
	if surface, ok := c.surfaces[name]; ok && surface.Toggleable {
		c.setSurface(name, true)
		return
	}
	if name == settingsRole {
		c.launchSettings()
	}
}

func (c *Controller) launchSettings() {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.settingsCmd != nil {
		return
	}

	cmd := exec.Command(settingsBinPath())
	// Own process group so the whole WebKit subprocess tree can be killed at once.
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	// The app loads the same served frontend as the bar (Vite in dev, Go in prod);
	// c.url already carries ?port= for the WS bus.
	cmd.Env = append(os.Environ(), "NEOSHELL_SETTINGS_URL="+c.url+"&view=settings")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Start(); err != nil {
		log.Printf("launch settings app: %v", err)
		return
	}
	c.settingsCmd = cmd
	go c.reapSettings(cmd)
}

// reapSettings clears the handle when the app exits on its own (e.g. the user
// closed its window), so a later open spawns a fresh instance.
func (c *Controller) reapSettings(cmd *exec.Cmd) {
	_ = cmd.Wait()
	c.mu.Lock()
	if c.settingsCmd == cmd {
		c.settingsCmd = nil
	}
	c.mu.Unlock()
}

// setSurface maps or unmaps a surface and records its state so window:toggle
// flips correctly.
func (c *Controller) setSurface(role string, show bool) {
	c.mu.Lock()
	c.openState[role] = show
	c.mu.Unlock()
	var err error
	if show {
		err = c.client.Show(role)
	} else {
		err = c.client.Hide(role)
	}
	if err != nil {
		log.Printf("render host %s: %v", role, err)
	}
}

func (c *Controller) closeWindow(name string) {
	if surface, ok := c.surfaces[name]; ok && surface.Toggleable {
		c.setSurface(name, false)
		return
	}
	if name != settingsRole {
		return
	}

	c.mu.Lock()
	cmd := c.settingsCmd
	c.settingsCmd = nil
	c.mu.Unlock()

	if cmd == nil || cmd.Process == nil {
		return
	}
	pid := cmd.Process.Pid
	if pgid, err := syscall.Getpgid(pid); err == nil {
		_ = syscall.Kill(-pgid, syscall.SIGTERM)
	} else {
		_ = cmd.Process.Kill()
	}
}

// settingsBinPath resolves the settings app binary: NEOSHELL_SETTINGS_BIN, else
// "neoshell-settings" on PATH.
func settingsBinPath() string {
	if path := os.Getenv("NEOSHELL_SETTINGS_BIN"); path != "" {
		return path
	}
	return "neoshell-settings"
}

// drainEvents logs render-host events (ready/log) and forwards native file
// drops to the frontend so the surface under the drop can act on them.
func (c *Controller) drainEvents() {
	for event := range c.client.Events() {
		switch event.Event {
		case "ready":
			log.Printf("render host: surface %q ready", event.Role)
		case "log":
			log.Printf("render host [%s]: %s", event.Level, event.Msg)
		case "drop":
			log.Printf("render host: DROP on %q at %.0f,%.0f — %d path(s): %v",
				event.Role, event.X, event.Y, len(event.Paths), event.Paths)
			c.hub.Broadcast("surface:drop", map[string]any{
				"role":  event.Role,
				"x":     event.X,
				"y":     event.Y,
				"paths": event.Paths,
			})
		case "drag":
			if event.Phase != "motion" {
				log.Printf("render host: DRAG %s on %q at %.0f,%.0f",
					event.Phase, event.Role, event.X, event.Y)
			}
			c.hub.Broadcast("surface:drag", map[string]any{
				"role":  event.Role,
				"phase": event.Phase,
				"x":     event.X,
				"y":     event.Y,
			})
		default:
			log.Printf("render host: event %q %+v", event.Event, event)
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
