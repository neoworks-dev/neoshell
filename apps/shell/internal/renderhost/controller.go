package renderhost

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/neoworks/neoshell/internal/ipc"
	"github.com/neoworks/neoshell/internal/server"
)

// barRole is the single overlay surface that hosts the shell frontend. It spans
// the output; the frontend carves out interactive areas via window:region and
// reserves space via window:exclusive, exactly as in the WebKitGTK build.
const barRole = "bar"

// desktopRole is the fullscreen desktop surface (icons and, later, widgets). It
// sits on the bottom layer — above the wallpaper, below application windows.
const desktopRole = "desktop"

// dockRole is the macOS-style bottom dock surface. It sits on the Top layer,
// anchored to the bottom edge, and is click-through except over the dock itself
// (the frontend sends its interactive region and a bottom exclusive zone).
const dockRole = "dock"

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
// commands to it. It replaces internal/bar in the Ultralight render path.
type Controller struct {
	hub     *server.Hub
	host    *Host
	client  *Client
	url     string
	monitor string

	mu          sync.Mutex
	settingsCmd *exec.Cmd // the running settings app, if any
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
	if err := controller.createDesktop(); err != nil {
		return err
	}
	if err := controller.createDock(); err != nil {
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
	c.closeWindow(settingsRole)
	c.client.Close()
	c.host.Stop()
}

// createBar creates the fullscreen overlay surface and immediately makes it
// click-through; the frontend then defines its interactive regions.
func (c *Controller) createBar() error {
	spec := SurfaceSpec{
		Role:    barRole,
		URL:     c.url,
		Monitor: c.monitor,
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

// createDesktop creates the fullscreen desktop surface that hosts draggable
// icons (and later widgets). It is anchored to all four edges on the bottom
// layer, so it spans the output above the wallpaper and below windows. It starts
// click-through; the frontend sends a full-screen interactive region once loaded
// (the whole desktop must receive input so a drag is not lost over empty areas).
func (c *Controller) createDesktop() error {
	spec := SurfaceSpec{
		Role:     desktopRole,
		URL:      desktopURL(c.url),
		Monitor:  c.monitor,
		Layer:    LayerBottom,
		Anchors:  []Edge{EdgeTop, EdgeBottom, EdgeLeft, EdgeRight},
		Keyboard: KeyboardNone,
	}
	if err := c.client.CreateSurface(spec); err != nil {
		return fmt.Errorf("create desktop surface: %w", err)
	}
	return c.client.SetInputRegion(desktopRole, nil)
}

// desktopURL appends the desktop view selector to the shared frontend URL, which
// already carries the WS port query (…?port=N).
func desktopURL(base string) string {
	return base + "&view=desktop"
}

// createDock creates the bottom dock surface: a full-width strip anchored to the
// bottom edge on the Top layer. It starts click-through; the frontend sends an
// interactive region over the dock pill and reserves a bottom exclusive zone.
func (c *Controller) createDock() error {
	spec := SurfaceSpec{
		Role:     dockRole,
		URL:      dockURL(c.url),
		Monitor:  c.monitor,
		Layer:    LayerTop,
		Anchors:  []Edge{EdgeBottom, EdgeLeft, EdgeRight},
		Keyboard: KeyboardNone,
	}
	if err := c.client.CreateSurface(spec); err != nil {
		return fmt.Errorf("create dock surface: %w", err)
	}
	return c.client.SetInputRegion(dockRole, nil)
}

// dockURL appends the dock view selector to the shared frontend URL.
func dockURL(base string) string {
	return base + "&view=dock"
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
	if name != settingsRole {
		return false
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.settingsCmd != nil
}

// openWindow launches a shell application for a named role. Settings is a
// separate process (neoshell-settings) that hosts its UI in its own window and
// talks to the Go core over the WS bus — it is not a shell surface.
func (c *Controller) openWindow(name string) {
	if name != settingsRole {
		return
	}

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

func (c *Controller) closeWindow(name string) {
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
