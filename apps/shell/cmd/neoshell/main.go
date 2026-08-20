package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"strconv"
	"sync"

	"github.com/neoworks/neoshell/internal/config"
	"github.com/neoworks/neoshell/internal/eventbus"
	"github.com/neoworks/neoshell/internal/hyprland"
	"github.com/neoworks/neoshell/internal/notifications"
	"github.com/neoworks/neoshell/internal/plugins"
	"github.com/neoworks/neoshell/internal/renderhost"
	"github.com/neoworks/neoshell/internal/server"
	"github.com/neoworks/neoshell/internal/system"
	"github.com/neoworks/neoshell/internal/wallpaper"
)

const defaultPort = 9876

func main() {
	// `neoshell emit <topic>` sends one control event to the running core's event
	// socket and exits, so a Hyprland keybind can drive voice/surface actions.
	if len(os.Args) > 1 && os.Args[1] == "emit" {
		runEmit(os.Args[2:])
		return
	}

	fs := flag.NewFlagSet("neoshell", flag.ExitOnError)
	fs.Usage = func() {
		fmt.Fprintf(os.Stderr, `neoshell - Hyprland overlay bar

Usage:
  neoshell [options]

Options:
  --monitor string    monitor connector to run on (e.g. HDMI-A-1); empty = default
  --port, -p int      port for the embedded HTTP/WebSocket server (default %d)
  --frontend, -f dir  path to a built frontend directory to serve directly; when
                      empty, the render host loads the dev server at localhost:5173
  --help, -h          show this help and exit

Environment:
  NEOSHELL_MONITOR    default for --monitor
  NEOSHELL_PORT       default for --port
  NEOSHELL_FRONTEND   default for --frontend
`, defaultPort)
	}

	// Monitor connector to display the bar on (e.g. "HDMI-A-1").
	// Empty means the first/default monitor. Flag overrides the env var.
	monitor := fs.String("monitor", os.Getenv("NEOSHELL_MONITOR"),
		"monitor connector name to run on (e.g. HDMI-A-1); empty = default")

	// Port for the embedded HTTP/WebSocket server. The webview also loads the
	// frontend from this port when -frontend is set.
	port := fs.Int("port", envPort(), "port for the embedded HTTP/WebSocket server")
	fs.IntVar(port, "p", *port, "shorthand for --port")

	// Path to a built frontend directory. When set, the Go server serves it
	// directly so no separate dev server is required.
	frontend := fs.String("frontend", os.Getenv("NEOSHELL_FRONTEND"),
		"path to a built frontend directory to serve directly")
	fs.StringVar(frontend, "f", *frontend, "shorthand for --frontend")

	// Directory of surface plugins (each a subdirectory with a manifest.json).
	// Empty falls back to the built-in shell surfaces.
	pluginsDir := fs.String("plugins", os.Getenv("NEOSHELL_PLUGINS"),
		"path to the plugins directory; empty = built-in shell surfaces")

	help := fs.Bool("help", false, "show this help and exit")
	fs.BoolVar(help, "h", false, "shorthand for --help")

	fs.Parse(os.Args[1:])

	if *help {
		fs.SetOutput(os.Stdout)
		fs.Usage()
		os.Exit(0)
	}

	if *frontend != "" {
		if info, err := os.Stat(*frontend); err != nil || !info.IsDir() {
			log.Fatalf("frontend path %q is not a directory: %v", *frontend, err)
		}
	}

	hypr, err := hyprland.NewClient()
	if err != nil {
		log.Fatalf("failed to connect to hyprland: %v", err)
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	hub := server.NewHub()
	bus := eventbus.New()
	sys := system.New()

	// Notification daemon: own the freedesktop name (replacing any other daemon)
	// and bridge each notification onto the WS "notification" topic. A bus failure
	// is non-fatal — the rest of the shell runs without notifications.
	notifier, err := notifications.NewDaemon(func(event notifications.Event) {
		hub.Broadcast("notification", event)
	})
	if err != nil {
		log.Printf("notifications: %v", err)
	}

	srv := server.New(hub, bus, hypr, sys, cfg, notifier, *frontend, *pluginsDir)

	// Config is the shell's source of truth: broadcast every change so the bar and
	// settings window react live, and drive the wallpaper daemon when it changes.
	var wallpaperMu sync.Mutex
	var lastWallpaper string
	applyWallpaper := func() {
		path, _ := cfg.Get("appearance.wallpaper")
		wallpaperPath, _ := path.(string)
		wallpaperMu.Lock()
		defer wallpaperMu.Unlock()
		if wallpaperPath == "" || wallpaperPath == lastWallpaper {
			return
		}
		lastWallpaper = wallpaperPath
		if err := wallpaper.SetWallpaper(wallpaperPath); err != nil {
			log.Printf("apply wallpaper: %v", err)
		}
	}
	// The bar/dock blur is composited by Hyprland (CSS can't blur across surfaces),
	// so the blur amount maps onto Hyprland's global blur size and keeps blur on.
	applyBlur := func() {
		size := 8
		if value, ok := cfg.Get("appearance.background.blur"); ok {
			switch v := value.(type) {
			case int:
				size = v
			case float64:
				size = int(v)
			}
		}
		hypr.Keyword("decoration:blur:enabled", "true")
		hypr.Keyword("decoration:blur:size", strconv.Itoa(size))
	}
	cfg.OnChange(func(snapshot map[string]any) {
		hub.Broadcast("config", snapshot)
		applyWallpaper()
		applyBlur()
	})
	// Seed the cached topic state so subscribers hydrate immediately, and apply the
	// persisted wallpaper once the daemon is reachable.
	hub.Broadcast("config", cfg.Snapshot())
	go applyWallpaper()

	// When the frontend is served by the Go server, point the render host at it;
	// otherwise fall back to the Vite dev server.
	uri := "http://localhost:5173"
	if *frontend != "" {
		uri = fmt.Sprintf("http://localhost:%d", *port)
	}

	manifests, err := plugins.Load(*pluginsDir)
	if err != nil {
		log.Fatalf("load plugins: %v", err)
	}
	surfaces := plugins.Resolve(manifests)

	go hub.Run()
	// Control-event socket: `neoshell emit <topic>` (bound to Hyprland keys)
	// writes here; subscribers registered in server.New fan the events out.
	go func() {
		if err := eventbus.Serve(context.Background(), eventbus.SocketPath(), bus); err != nil {
			log.Printf("event socket: %v", err)
		}
	}()
	// Loopback only. The shell's HTTP surface drives the desktop — launching
	// apps, moving windows, invoking capabilities — so it must not be reachable
	// from the network. The render host, the only thing that talks to it, runs
	// on this machine.
	listener, err := srv.Listen(fmt.Sprintf("127.0.0.1:%d", *port))
	if err != nil {
		log.Fatalf("server: %v", err)
	}
	defer listener.Close()

	go hypr.EventLoop(hub)
	go sys.Poll(hub)
	// Bridge the wallpaper daemon's bar-strip colors to the frontend. Tolerates
	// the daemon being absent; reconnects when it appears.
	go wallpaper.Watch(hub)

	// Enable compositor blur behind surfaces that request it (bar, dock). CSS
	// backdrop-filter can't blur across surfaces, so the blur must come from
	// Hyprland. These are fullscreen-transparent layers, so ignorealpha confines
	// the blur to the painted regions. Best-effort; needs global blur
	// (decoration:blur) enabled.
	for _, namespace := range blurNamespaces(surfaces) {
		hypr.Keyword("layerrule", "blur,"+namespace)
		hypr.Keyword("layerrule", "ignorealpha 0.1,"+namespace)
	}
	applyBlur()

	// Keybinds are no longer injected by the core. The user declares them in their
	// own Hyprland config, each running `neoshell emit <topic>` (e.g.
	// surface:toggle). See the project README for the set.

	// The frontend reads ?port to find the WebSocket regardless of where the page
	// is served, so the render host's surface URL carries it too.
	surfaceURL := fmt.Sprintf("%s?port=%d", uri, *port)
	if err := renderhost.Run(hub, surfaceURL, *monitor, renderhost.DefaultBinPath(), surfaces); err != nil {
		log.Fatalf("render host: %v", err)
	}
}

// blurNamespaces returns the layer-shell namespaces to blur, derived from the
// plugin surfaces that request it. It falls back to the built-in bar and dock
// when no plugins declare surfaces.
func blurNamespaces(surfaces []plugins.ResolvedSurface) []string {
	if len(surfaces) == 0 {
		return []string{"neoshell.bar", "neoshell.dock"}
	}
	var namespaces []string
	for _, surface := range surfaces {
		if surface.Blur {
			namespaces = append(namespaces, "neoshell."+surface.View)
		}
	}
	return namespaces
}

// envPort returns the port from NEOSHELL_PORT, or defaultPort if unset/invalid.
func envPort() int {
	if v := os.Getenv("NEOSHELL_PORT"); v != "" {
		if p, err := strconv.Atoi(v); err == nil {
			return p
		}
	}
	return defaultPort
}
