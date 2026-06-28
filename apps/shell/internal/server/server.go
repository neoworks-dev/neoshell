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
	"github.com/neoworks/neoshell/internal/config"
	"github.com/neoworks/neoshell/internal/hyprland"
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
	frontend string // dir to serve static frontend from; empty = disabled
}

func New(hub *Hub, hypr *hyprland.Client, sys *system.System, cfg *config.Store, frontend string) *Server {
	return &Server{hub: hub, hypr: hypr, sys: sys, cfg: cfg, frontend: frontend}
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

func resolveIconPath(iconName string, size int) string {
	if iconName == "" {
		return ""
	}

	// if it's already an absolute path, use it directly
	if filepath.IsAbs(iconName) {
		return iconName
	}

	theme := "hicolor" // fallback theme, could read from GTK settings

	baseDirs := []string{
		os.ExpandEnv("$HOME/.local/share/icons"),
		os.ExpandEnv("$HOME/.icons"),
		"/usr/share/icons",
		"/usr/local/share/icons",
		"/usr/share/pixmaps",
	}

	exts := []string{".png", ".svg", ".xpm"}

	// try themed icon first, then hicolor fallback, then pixmaps
	for _, base := range baseDirs {
		for _, t := range []string{theme, "hicolor"} {
			// try closest size first, then scalable
			for _, subdir := range []string{
				fmt.Sprintf("%dx%d/apps", size, size),
				"scalable/apps",
				fmt.Sprintf("%dx%d/devices", size, size),
				fmt.Sprintf("%dx%d/mimetypes", size, size),
			} {
				for _, ext := range exts {
					path := filepath.Join(base, t, subdir, iconName+ext)
					if _, err := os.Stat(path); err == nil {
						return path
					}
				}
			}
		}
	}

	// last resort — pixmaps
	for _, ext := range exts {
		path := filepath.Join("/usr/share/pixmaps", iconName+ext)
		if _, err := os.Stat(path); err == nil {
			return path
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
		edge := msg.Edge
		if edge == "" {
			edge = "top"
		}
		s.hub.SendExclusiveZone(edge, msg.Size)

	case "window:region":
		s.hub.SendRegionUpdate(msg.Rects)

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
