// Package bar provides the main window and input region management for neobar.
// It uses gtk4-layer-shell to create an overlay bar on Hyprland that accepts
// input only in specified regions, allowing click-through on other areas.
package bar

import (
	"fmt"
	"net/http"
	"net/url"
	"strconv"

	layershell "github.com/diamondburned/gotk4-layer-shell/pkg/gtk4layershell"
	webkit "github.com/diamondburned/gotk4-webkitgtk/pkg/webkit/v6"
	"github.com/diamondburned/gotk4/pkg/cairo"
	gdk "github.com/diamondburned/gotk4/pkg/gdk/v4"
	"github.com/diamondburned/gotk4/pkg/glib/v2"
	"github.com/diamondburned/gotk4/pkg/gtk/v4"

	"github.com/neoworks/neobar/internal/ipc"
	"github.com/neoworks/neobar/internal/server"
)

const (
	barHeight   = 36 // must match the visible top-bar height in the frontend (Notch.svelte)
	panelHeight = 500
	panelWidth  = 640
)

// Commander defines the interface for subscribing to window commands.
type Commander interface {
	Subscribe(name string) chan ipc.WindowCommand
	Unsubscribe(name string, ch chan ipc.WindowCommand)
}

// Shell represents the main application window.
// It manages a single overlay window that covers the entire screen but only
// accepts input in specified regions (typically the top bar area).
type Shell struct {
	app     *gtk.Application
	win     *gtk.ApplicationWindow
	hub     *server.Hub
	monitor string // connector name to run on; empty = default
	url     string // base URL the webview loads the frontend from
	port    int    // server port; passed to the webview so it finds the WS
	width   int
}

// New creates a new Bar instance with the given server hub.
// monitor is the connector name to display on (e.g. "HDMI-A-1");
// empty selects the first/default monitor.
// url is the base address the webview loads the frontend from.
// port is the server port, forwarded to the webview so the frontend's
// WebSocket connects to the right backend regardless of where the page is served.
func New(hub *server.Hub, monitor, url string, port int) *Shell {
	return &Shell{hub: hub, monitor: monitor, url: url, port: port}
}

// Run starts the GTK application and enters the main loop.
func (shell *Shell) Run(args []string) {
	shell.app = gtk.NewApplication("com.neoworks.neobar", 0)
	shell.app.ConnectActivate(shell.activate)
	shell.app.Run(args)
}

// activate initializes and shows the main overlay window.
// It sets up:
// - A transparent, undecorated window
// - Layer-shell integration for Hyprland overlay
// - A WebKit webview running the frontend
// - Input region restriction for click-through support
func (shell *Shell) activate() {
	shell.win = gtk.NewApplicationWindow(shell.app)
	shell.win.SetDecorated(false)
	gtk.BaseWidget(shell.win).AddCSSClass("transparent")

	cssProvider := gtk.NewCSSProvider()
	cssProvider.LoadFromString(`
		.transparent { background: transparent; }
		window { background: transparent; }
	`)
	gtk.StyleContextAddProviderForDisplay(
		gtk.BaseWidget(shell.win).Display(),
		cssProvider,
		gtk.STYLE_PROVIDER_PRIORITY_APPLICATION,
	)

	// Initialize layer-shell for Hyprland integration
	layershell.InitForWindow(&shell.win.Window)
	layershell.SetLayer(&shell.win.Window, layershell.LayerShellLayerOverlay)
	layershell.SetKeyboardMode(&shell.win.Window, layershell.LayerShellKeyboardModeOnDemand)
	// Stable namespace so the compositor can target the surface (e.g. a
	// Hyprland `layerrule = blur, neobar` to blur the desktop behind the bar).
	layershell.SetNamespace(&shell.win.Window, "neobar")

	// Reserve nothing initially; the frontend drives the exclusive zone over
	// IPC (window:exclusive). Anchored so the surface still spans the whole
	// screen, leaving the dynamic island and panels free to render anywhere.
	shell.setExclusiveZone("top", 0)

	// Pin the bar to the configured monitor (falls back to the first one).
	display := gtk.BaseWidget(shell.win).Display()
	monitor := shell.pickMonitor(display)
	layershell.SetMonitor(&shell.win.Window, monitor)

	// Get monitor dimensions for fullscreen window
	screenWidth := monitor.Geometry().Width()
	screenHeight := monitor.Geometry().Height()
	shell.width = screenWidth

	// Create horizontal box with transparent WebKit view
	box := gtk.NewBox(gtk.OrientationHorizontal, 0)
	gtk.BaseWidget(box).AddCSSClass("transparent")

	wv := webkit.NewWebView()

	settings := wv.Settings()
	settings.SetHardwareAccelerationPolicy(webkit.HardwareAccelerationPolicyAlways)
	settings.SetEnableOfflineWebApplicationCache(true)
	settings.SetEnableWebgl(true)
	settings.SetEnablePageCache(true)
	settings.SetEnableJavascript(true)
	settings.SetJavascriptCanAccessClipboard(true)
	settings.SetEnableHyperlinkAuditing(false)
	settings.SetEnableSiteSpecificQuirks(false)
	settings.SetEnableBackForwardNavigationGestures(false)

	query := url.Values{}
	query.Set("port", strconv.Itoa(shell.port))
	if shell.monitor != "" {
		query.Set("monitor", shell.monitor)
	}
	uri := shell.url + "?" + query.Encode()
	wv.LoadURI(uri)
	gtk.BaseWidget(wv).SetHExpand(true)

	transparent := gdk.NewRGBA(0, 0, 0, 0)
	wv.SetBackgroundColor(&transparent)
	wv.SetFocusable(true)

	click := gtk.NewGestureClick()
	click.SetButton(0) // 0 means all buttons
	click.ConnectPressed(func(nPress int, x, y float64) {
		fmt.Printf("Clicked at (%.2f, %.2f) with %d presses\n", x, y, nPress)
		shell.win.Present()
		wv.GrabFocus()
	})
	wv.AddController(click)

	box.Append(wv)
	shell.win.SetChild(box)
	shell.win.SetDefaultSize(screenWidth, screenHeight)
	shell.win.SetVisible(true)

	// Start listening for commands from the frontend
	go shell.listenCommands()
}

// pickMonitor returns the GDK monitor matching the configured connector name.
// If no name is set or no match is found, it falls back to the first monitor.
func (shell *Shell) pickMonitor(display *gdk.Display) *gdk.Monitor {
	monitors := display.Monitors()
	fallback := monitors.Item(0).Cast().(*gdk.Monitor)
	if shell.monitor == "" {
		return fallback
	}

	for i := uint(0); i < monitors.NItems(); i++ {
		m := monitors.Item(i).Cast().(*gdk.Monitor)
		if m.Connector() == shell.monitor {
			return m
		}
	}

	fmt.Printf("monitor %q not found, using default\n", shell.monitor)
	return fallback
}

// listenCommands subscribes to window and region command channels and
// dispatches them to the appropriate handlers.
func (shell *Shell) listenCommands() {
	chWindow := shell.hub.Subscribe("window")
	chRegion := shell.hub.Subscribe("region")
	defer shell.hub.Unsubscribe("window", chWindow)
	defer shell.hub.Unsubscribe("region", chRegion)

	for {
		select {
		case msg := <-chWindow:
			shell.handleWindowCommand(msg)
		case msg := <-chRegion:
			shell.handleWindowCommand(msg)
		}
	}
}

// handleWindowCommand processes incoming window commands.
// Supported actions:
// - "open": Opens the panel (deprecated, use region-based approach)
// - "close": Closes the panel (deprecated)
// - "toggle": Toggles panel visibility (deprecated)
// - "region": Applies input region restrictions based on provided rectangles
func (shell *Shell) handleWindowCommand(msg ipc.WindowCommand) {
	switch msg.Action {
	case "open":
		glib.IdleAdd(func() { openPanel(shell.win, shell.width) })
	case "close":
		glib.IdleAdd(func() { closePanel(shell.win, shell.width) })
	case "toggle":
		glib.IdleAdd(func() { togglePanel(shell.win, shell.width) })

	case "region":
		glib.IdleAdd(func() { shell.applyInputRegion(msg.Rects) })

	case "exclusive":
		edge := msg.Edge
		size := msg.Size
		glib.IdleAdd(func() { shell.setExclusiveZone(edge, size) })

	}
}

// setExclusiveZone anchors the overlay so it still spans the whole output
// while reserving `size` pixels along `edge` ("top", "bottom", "left" or
// "right"). The surface is anchored to every edge except the one opposite
// `edge`, so it keeps full-screen coverage for the island and panels; only
// the exclusive zone pushes tiled windows away. A size of 0 reserves nothing.
func (shell *Shell) setExclusiveZone(edge string, size int) {
	window := &shell.win.Window

	anchorTop := edge != "bottom"
	anchorBottom := edge != "top"
	anchorLeft := edge != "right"
	anchorRight := edge != "left"

	layershell.SetAnchor(window, layershell.LayerShellEdgeTop, anchorTop)
	layershell.SetAnchor(window, layershell.LayerShellEdgeBottom, anchorBottom)
	layershell.SetAnchor(window, layershell.LayerShellEdgeLeft, anchorLeft)
	layershell.SetAnchor(window, layershell.LayerShellEdgeRight, anchorRight)
	layershell.SetExclusiveZone(window, size)

	// Force GTK to commit the layer-surface changes to the compositor.
	// Without a pending frame the new anchors/zone may never be flushed
	// (applyInputRegion does the same for input regions).
	gtk.BaseWidget(shell.win).QueueAllocate()

	fmt.Printf("exclusive zone applied: edge=%s size=%d\n", edge, size)
}

// applyInputRegion sets the input region for the overlay window.
// This controls where mouse/keyboard input is accepted - areas outside
// the specified regions will be click-through, allowing interaction
// with windows below the overlay.
//
// The function handles timing issues by retrying if the native surface
// is not yet available. It uses cairo.Region to define multiple
// rectangular input areas.
//
// Note: Hyprland's layer-shell implementation may not fully respect
// SetInputRegion for all input types. For popup windows that need
// guaranteed input handling, separate GTK windows should be used.
func (shell *Shell) applyInputRegion(rects []ipc.Rect) {
	native := gtk.BaseWidget(shell.win).Native()
	if native == nil {
		// Surface not ready, retry after a short delay
		glib.TimeoutAdd(100, func() bool {
			shell.applyInputRegion(rects)
			return false
		})
		return
	}

	surface := native.Surface()
	if surface == nil {
		glib.TimeoutAdd(100, func() bool {
			shell.applyInputRegion(rects)
			return false
		})
		return
	}

	gdkSurface, ok := surface.(*gdk.Surface)
	if !ok {
		fmt.Printf("Surface is not *gdk.Surface, got %T\n", surface)
		return
	}

	// Create a new cairo region and union all provided rectangles
	// Note: UnionRectangle returns a new region, it does not modify in place
	region, err := cairo.RegionCreate()
	if err != nil {
		fmt.Printf("Failed to create region: %v\n", err)
		return
	}

	for _, r := range rects {
		rect := &cairo.Rectangle{X: r.X, Y: r.Y, Width: r.W, Height: r.H}
		newRegion, err := region.UnionRectangle(rect)
		if err != nil {
			fmt.Printf("UnionRectangle error: %v for rect %+v\n", err, r)
			continue
		}
		region = newRegion
	}

	gdkSurface.SetInputRegion(region)

	// Force a re-render to ensure the region is applied
	gtk.BaseWidget(shell.win).QueueAllocate()
}

// RegisterHTTP registers HTTP endpoints for development compatibility.
// These endpoints allow controlling the panel from external scripts.
func (shell *Shell) RegisterHTTP() {
	http.HandleFunc("/open", func(w http.ResponseWriter, r *http.Request) {
		glib.IdleAdd(func() { openPanel(shell.win, shell.width) })
	})
	http.HandleFunc("/close", func(w http.ResponseWriter, r *http.Request) {
		glib.IdleAdd(func() { closePanel(shell.win, shell.width) })
	})
}
