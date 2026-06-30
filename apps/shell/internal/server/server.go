package server

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/neoworks/neoshell/internal/apps"
	"github.com/neoworks/neoshell/internal/config"
	"github.com/neoworks/neoshell/internal/fileindex"
	"github.com/neoworks/neoshell/internal/hyprland"
	"github.com/neoworks/neoshell/internal/notifications"
	"github.com/neoworks/neoshell/internal/shell"
	"github.com/neoworks/neoshell/internal/system"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// Client represents a connected WebSocket client.
type Client struct {
	conn *websocket.Conn
	send chan []byte
	mu   sync.Mutex
}

func (c *Client) Send(data []byte) {
	select {
	case c.send <- data:
	default:
		// client too slow, drop
	}
}

// Server wires HTTP, WebSocket, and message routing.
type Server struct {
	hub      *Hub
	hypr     *hyprland.Client
	sys      *system.System
	cfg      *config.Store
	notifier *notifications.Daemon // may be nil if the bus was unavailable
	index    *fileindex.Index      // file search index (may still be building)
	frontend string                // dir to serve static frontend from; empty = disabled
}

func New(hub *Hub, hypr *hyprland.Client, sys *system.System, cfg *config.Store, notifier *notifications.Daemon, index *fileindex.Index, frontend string) *Server {
	return &Server{hub: hub, hypr: hypr, sys: sys, cfg: cfg, notifier: notifier, index: index, frontend: frontend}
}

func findAppIcon(class string) string {
	// search locations
	dirs := []string{
		"/usr/share/applications",
		"/usr/local/share/applications",
		os.ExpandEnv("$HOME/.local/share/applications"),
	}

	for _, dir := range dirs {
		// try exact match first, then case-insensitive
		entries, _ := os.ReadDir(dir)
		for _, e := range entries {
			if !strings.HasSuffix(e.Name(), ".desktop") {
				continue
			}
			name := strings.TrimSuffix(strings.ToLower(e.Name()), ".desktop")
			if name == strings.ToLower(class) {
				return parseIconFromDesktop(filepath.Join(dir, e.Name()))
			}
		}
	}
	return ""
}

func parseIconFromDesktop(path string) string {
	data, _ := os.ReadFile(path)
	for line := range strings.SplitSeq(string(data), "\n") {
		if after, ok := strings.CutPrefix(line, "Icon="); ok {
			return after
		}
	}
	return ""
}

func (s *Server) Listen(addr string) {
	http.HandleFunc("/ws", s.handleWS)
	http.HandleFunc("/icon/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Printf("icon request: %s\n", r.URL.Path)
		class := strings.TrimPrefix(r.URL.Path, "/icon/")
		icon := findAppIcon(class)
		// then resolve icon name to actual file path using icon theme
		path := resolveIconPath(icon, 32)
		http.ServeFile(w, r, path)
	})
	// /appicon/<name> resolves a freedesktop icon name (from a .desktop Icon=)
	// directly to its themed image, for the desktop's real app icons.
	http.HandleFunc("/appicon/", func(w http.ResponseWriter, r *http.Request) {
		name := strings.TrimPrefix(r.URL.Path, "/appicon/")
		path := resolveIconPath(name, 64)
		if path == "" {
			http.NotFound(w, r)
			return
		}
		http.ServeFile(w, r, path)
	})
	// /wallpaper serves the configured wallpaper image so the desktop can sample
	// it (per-icon label contrast). CORS-open so the canvas isn't tainted in dev,
	// where the page is served from a different origin than this server.
	http.HandleFunc("/wallpaper", func(w http.ResponseWriter, r *http.Request) {
		value, _ := s.cfg.Get("appearance.wallpaper")
		path, _ := value.(string)
		if path == "" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Access-Control-Allow-Origin", "*")
		http.ServeFile(w, r, path)
	})
	// /toggle?surface=<role> flips a shell surface's visibility. Used by the
	// injected Hyprland keybind (Win+Space) to open/close the apps overlay
	// without a persistent IPC channel into the compositor.
	http.HandleFunc("/toggle", func(w http.ResponseWriter, r *http.Request) {
		surface := r.URL.Query().Get("surface")
		if surface == "" {
			surface = "overlay"
		}
		s.hub.SendWindowCommand(surface, "toggle")
		w.WriteHeader(http.StatusNoContent)
	})
	// Serve the built frontend directly when configured. Registered last and at
	// the root so the more specific /ws and /icon/ routes take precedence. CEF is
	// full Chromium, so no compatibility shim or CSS rewriting is needed.
	if s.frontend != "" {
		http.Handle("/", http.FileServer(http.Dir(s.frontend)))
		log.Printf("serving frontend from %s", s.frontend)
	}
	log.Printf("server listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, nil))
}

func (s *Server) handleWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("ws upgrade error: %v", err)
		return
	}

	client := &Client{conn: conn, send: make(chan []byte, 64)}
	s.hub.Register(client)
	defer s.hub.Unregister(client)

	// writer goroutine
	go func() {
		for data := range client.send {
			client.mu.Lock()
			conn.WriteMessage(websocket.TextMessage, data)
			client.mu.Unlock()
		}
	}()

	// reader loop
	for {
		_, raw, err := conn.ReadMessage()
		if err != nil {
			break
		}
		var msg InMessage
		if err := json.Unmarshal(raw, &msg); err != nil {
			continue
		}
		s.route(client, msg)
	}
}

func (s *Server) route(c *Client, msg InMessage) {
	switch msg.Type {
	case "subscribe":
		s.hub.SubscribeClient(c, msg.To)

	case "unsubscribe":
		s.hub.UnsubscribeClient(c, msg.To)

	case "run":
		go func() {
			out, err := shell.Run(msg.Cmd)
			result := map[string]string{"id": msg.ID, "output": out}
			if err != nil {
				result["error"] = err.Error()
			}
			data, _ := json.Marshal(OutMessage{Type: "run:result", Data: result})
			c.Send(data)
		}()

	case "watch":
		go func() {
			shell.Watch(msg.Cmd, func(line string) {
				data, _ := json.Marshal(OutMessage{
					Type: "watch:line",
					Data: map[string]string{"id": msg.ID, "line": line},
				})
				c.Send(data)
			})
		}()

	case "hyprland:dispatch":
		go s.hypr.Dispatch(msg.Dispatcher, msg.Arg)

	case "window":
		// window:open, window:close, window:toggle
		// msg.Name = window name (empty = default bar window)
		name := msg.Name
		if name == "" {
			name = "bar"
		}
		s.hub.SendWindowCommand(name, msg.Action)

	case "window:exclusive":
		// Frontend reserves `size` px along `edge` (or clears it with size 0).
		// Name selects the surface (empty = the bar).
		name := msg.Name
		if name == "" {
			name = "bar"
		}
		edge := msg.Edge
		if edge == "" {
			edge = "top"
		}
		s.hub.SendExclusiveZone(name, edge, msg.Size)

	case "window:region":
		// Name selects the surface whose input region to set (empty = the bar).
		name := msg.Name
		if name == "" {
			name = "bar"
		}
		s.hub.SendRegionUpdate(name, msg.Rects)

	case "apps:list":
		data, _ := json.Marshal(OutMessage{Type: "apps", Data: apps.List()})
		c.Send(data)

	case "search:files":
		// Echo the query back so the client can drop stale (out-of-order) results.
		data, _ := json.Marshal(OutMessage{Type: "searchResults", Data: map[string]any{
			"query":   msg.Query,
			"results": s.searchFiles(msg.Query),
		}})
		c.Send(data)

	case "launch":
		// Spawn an application detached; the compositor maps its window.
		if err := apps.Launch(msg.Cmd); err != nil {
			log.Printf("launch %q: %v", msg.Cmd, err)
		}

	case "notification:action":
		if s.notifier != nil {
			s.notifier.InvokeAction(msg.NotifID, msg.ActionKey)
		}

	case "notification:close":
		if s.notifier != nil {
			s.notifier.Close(msg.NotifID, msg.Reason)
		}

	case "config:get":
		data, _ := json.Marshal(OutMessage{Type: "config", Data: s.cfg.Snapshot()})
		c.Send(data)

	case "config:set":
		var value any
		if err := json.Unmarshal(msg.Value, &value); err != nil {
			log.Printf("config:set %q: bad value: %v", msg.Key, err)
			return
		}
		if err := s.cfg.Set(msg.Key, value); err != nil {
			log.Printf("config:set %q: %v", msg.Key, err)
		}

	default:
		log.Printf("unknown message type: %s", msg.Type)
	}
}
