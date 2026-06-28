package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"strconv"

	"github.com/neoworks/neobar/internal/hyprland"
	"github.com/neoworks/neobar/internal/renderhost"
	"github.com/neoworks/neobar/internal/server"
	"github.com/neoworks/neobar/internal/system"
	"github.com/neoworks/neobar/internal/wallpaper"
)

const defaultPort = 9876

func main() {
	fs := flag.NewFlagSet("neobar", flag.ExitOnError)
	fs.Usage = func() {
		fmt.Fprintf(os.Stderr, `neobar - Hyprland overlay bar

Usage:
  neobar [options]

Options:
  --monitor string    monitor connector to run on (e.g. HDMI-A-1); empty = default
  --port, -p int      port for the embedded HTTP/WebSocket server (default %d)
  --frontend, -f dir  path to a built frontend directory to serve directly; when
                      empty, the render host loads the dev server at localhost:5173
  --help, -h          show this help and exit

Environment:
  NEOBAR_MONITOR    default for --monitor
  NEOBAR_PORT       default for --port
  NEOBAR_FRONTEND   default for --frontend
`, defaultPort)
	}

	// Monitor connector to display the bar on (e.g. "HDMI-A-1").
	// Empty means the first/default monitor. Flag overrides the env var.
	monitor := fs.String("monitor", os.Getenv("NEOBAR_MONITOR"),
		"monitor connector name to run on (e.g. HDMI-A-1); empty = default")

	// Port for the embedded HTTP/WebSocket server. The webview also loads the
	// frontend from this port when -frontend is set.
	port := fs.Int("port", envPort(), "port for the embedded HTTP/WebSocket server")
	fs.IntVar(port, "p", *port, "shorthand for --port")

	// Path to a built frontend directory. When set, the Go server serves it
	// directly so no separate dev server is required.
	frontend := fs.String("frontend", os.Getenv("NEOBAR_FRONTEND"),
		"path to a built frontend directory to serve directly")
	fs.StringVar(frontend, "f", *frontend, "shorthand for --frontend")

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

	hub := server.NewHub()
	sys := system.New()
	srv := server.New(hub, hypr, sys, *frontend)

	// When the frontend is served by the Go server, point the render host at it;
	// otherwise fall back to the Vite dev server.
	uri := "http://localhost:5173"
	if *frontend != "" {
		uri = fmt.Sprintf("http://localhost:%d", *port)
	}

	go hub.Run()
	go srv.Listen(fmt.Sprintf(":%d", *port))
	go hypr.EventLoop(hub)
	go sys.Poll(hub)
	// Bridge the wallpaper daemon's bar-strip colors to the frontend. Tolerates
	// the daemon being absent; reconnects when it appears.
	go wallpaper.Watch(hub)

	// The frontend reads ?port to find the WebSocket regardless of where the page
	// is served, so the render host's surface URL carries it too.
	surfaceURL := fmt.Sprintf("%s?port=%d", uri, *port)
	if err := renderhost.Run(hub, surfaceURL, *monitor, renderhost.DefaultBinPath()); err != nil {
		log.Fatalf("render host: %v", err)
	}
}

// envPort returns the port from NEOBAR_PORT, or defaultPort if unset/invalid.
func envPort() int {
	if v := os.Getenv("NEOBAR_PORT"); v != "" {
		if p, err := strconv.Atoi(v); err == nil {
			return p
		}
	}
	return defaultPort
}
