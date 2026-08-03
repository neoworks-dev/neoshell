package server

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/neoworks/neoshell/internal/applauncher"
	"github.com/neoworks/neoshell/internal/apps"
	"github.com/neoworks/neoshell/internal/capability"
	"github.com/neoworks/neoshell/internal/config"
	"github.com/neoworks/neoshell/internal/eventbus"
	"github.com/neoworks/neoshell/internal/fileindex"
	"github.com/neoworks/neoshell/internal/files"
	"github.com/neoworks/neoshell/internal/hyprland"
	"github.com/neoworks/neoshell/internal/nib"
	"github.com/neoworks/neoshell/internal/notifications"
	"github.com/neoworks/neoshell/internal/overlay"
	"github.com/neoworks/neoshell/internal/shell"
	"github.com/neoworks/neoshell/internal/system"
	"github.com/neoworks/neoshell/internal/timers"
	"github.com/neoworks/neoshell/internal/widgets"
	"github.com/neoworks/neoshell/internal/windows"
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
	hub        *Hub
	hypr       *hyprland.Client
	sys        *system.System
	cfg        *config.Store
	notifier   *notifications.Daemon // may be nil if the bus was unavailable
	index      *fileindex.Index      // file search index (may still be building)
	timers     *timers.Service       // countdown timers + tracking sessions
	registry   *capability.Registry  // shared action registry (agent tools + launcher commands)
	frontend   string                // dir to serve static frontend from; empty = disabled
	pluginsDir string                // dir of surface plugins (each with a dist/); empty = disabled

	// Widget types are declared by the frontend's UI capability registry, so Go
	// learns them from the desktop surface's announcement over the relay. Cached
	// here for the widgets capability, which must validate a type before writing
	// one into config.
	widgetMu    sync.Mutex
	widgetTypes []widgets.Type

	// The agent backend's live session, plus the tool metadata used to render
	// its calls. Attached once the backend reports healthy; see agent.go.
	agent agentBridge
	// The in-flight spoken turn, if any; see voice.go.
	voice voiceTurn
	// Flips voice mode. Set by whoever owns the daemon process; guarded by
	// agent.mu, which already covers the rest of the assistant's wiring.
	voiceToggle func() bool
}

func New(hub *Hub, bus *eventbus.Bus, hypr *hyprland.Client, sys *system.System, cfg *config.Store, notifier *notifications.Daemon, index *fileindex.Index, frontend, pluginsDir string) *Server {
	server := &Server{hub: hub, hypr: hypr, sys: sys, cfg: cfg, notifier: notifier, index: index, frontend: frontend, pluginsDir: pluginsDir}
	server.timers = timers.New(func(state timers.State) {
		hub.Broadcast("timer", state)
	})
	// One registry, two front doors: the launcher invokes these actions by name
	// over the WebSocket, and the agent backend calls the same set as tools over
	// HTTP. Registering here is the only place a feature has to opt in to both.
	server.registry = capability.NewRegistry()
	server.registry.Register(server.timers.Capability())
	server.registry.Register(windows.New(hypr).Capability())
	server.registry.Register(applauncher.New().Capability())
	server.registry.Register(files.New(server.searchFiles).Capability())
	server.registry.Register(widgets.New(cfg, server.knownWidgetTypes).Capability())
	server.registry.Register(overlay.New(hub.Broadcast, notifier).Capability())

	// The voice pipeline runs in its own process (neoshell-voice), started and
	// stopped by the voice toggle. When running, it connects over this
	// WebSocket and drives the shared agent session (see voice.go).
	server.subscribeControlEvents(bus)
	return server
}

// subscribeControlEvents wires keybind-driven control events (from `neoshell
// emit`, over the event socket) to the same handlers the WebSocket routes use.
func (s *Server) subscribeControlEvents(bus *eventbus.Bus) {
	if bus == nil {
		return
	}
	// Voice control keybinds are forwarded to the voice daemon (if running) over
	// the hub as a "voice:control" topic; the daemon subscribes to it. When no
	// daemon is connected these are harmless no-ops.
	bus.Subscribe("voice:listen", func(eventbus.Event) { s.forwardVoiceControl("listen") })
	bus.Subscribe("voice:stop", func(eventbus.Event) { s.forwardVoiceControl("stop") })
	bus.Subscribe("voice:cancel", func(eventbus.Event) { s.forwardVoiceControl("cancel") })
	bus.Subscribe("voice:toggle", func(eventbus.Event) { s.toggleVoice() })

	bus.Subscribe("surface:toggle", func(e eventbus.Event) { s.handleSurface("toggle", e) })
	bus.Subscribe("surface:open", func(e eventbus.Event) { s.handleSurface("open", e) })
	bus.Subscribe("surface:close", func(e eventbus.Event) { s.handleSurface("close", e) })
	// Agent keybinds. Approving by key is the point of the design: a tool that
	// asks should be answerable without reaching for the mouse, and "always"
	// is how the user stops being asked about a thing they have decided on.
	bus.Subscribe("agent:open", func(eventbus.Event) { s.broadcastAgentPanel(true, false) })
	bus.Subscribe("agent:close", func(eventbus.Event) { s.broadcastAgentPanel(false, true) })
	bus.Subscribe("agent:ask", func(e eventbus.Event) {
		prompt := payloadText(e)
		s.broadcastAgentPanel(prompt == "", false)
		if prompt != "" {
			go s.handleAgentAsk(prompt)
		}
	})
	bus.Subscribe("agent:approve", func(eventbus.Event) { go s.handleAgentApprove("", nib.ApproveOnce, "") })
	bus.Subscribe("agent:deny", func(eventbus.Event) { go s.handleAgentApprove("", nib.ApproveDeny, "") })
	bus.Subscribe("agent:always", func(eventbus.Event) { go s.handleAgentApprove("", nib.ApproveSession, "") })
	bus.Subscribe("agent:always-project", func(eventbus.Event) { go s.handleAgentApprove("", nib.ApproveProject, "") })
	bus.Subscribe("agent:interrupt", func(eventbus.Event) { go s.handleAgentInterrupt() })
	bus.Subscribe("agent:restart", func(eventbus.Event) { s.restartAgent() })
}

// broadcastAgentPanel asks the notch to expand or collapse its agent panel.
func (s *Server) broadcastAgentPanel(focusInput, closePanel bool) {
	s.hub.BroadcastEphemeral("agent:panel", map[string]any{
		"open":  !closePanel,
		"focus": focusInput,
	})
}

// payloadText reads a free-text control payload, accepting a bare JSON string
// or {"text":"…"}, mirroring how surfaceClass reads its own.
func payloadText(event eventbus.Event) string {
	if len(event.Payload) == 0 {
		return ""
	}
	var text string
	if json.Unmarshal(event.Payload, &text) == nil && text != "" {
		return text
	}
	var obj struct {
		Text   string `json:"text"`
		Prompt string `json:"prompt"`
	}
	if json.Unmarshal(event.Payload, &obj) == nil {
		if obj.Text != "" {
			return obj.Text
		}
		return obj.Prompt
	}
	return ""
}

// handleSurface forwards a surface:* control event to the frontend. Each UI
// surface registers a class name and toggles itself when the broadcast class
// matches, so the event must name a target class — there is no default.
func (s *Server) handleSurface(action string, event eventbus.Event) {
	class := surfaceClass(event)
	if class == "" {
		log.Printf("surface:%s ignored: no class", action)
		return
	}
	s.hub.Broadcast("surface:toggle", map[string]any{"class": class, "action": action})
}

// surfaceClass reads the target class from the emit payload, accepting either a
// bare JSON string ("spotlight") or an object {"class":"spotlight"}.
func surfaceClass(event eventbus.Event) string {
	if len(event.Payload) == 0 {
		return ""
	}
	var class string
	if json.Unmarshal(event.Payload, &class) == nil && class != "" {
		return class
	}
	var obj struct {
		Class string `json:"class"`
	}
	if json.Unmarshal(event.Payload, &obj) == nil {
		return obj.Class
	}
	return ""
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

// Listen registers every HTTP route and binds addr, returning once the socket
// is accepting. Binding is synchronous on purpose: the agent backend is spawned
// with this server's address in its environment and queries /capabilities as it
// starts, so the listener must already exist by the time the child runs.
//
// Serving continues in a goroutine; the returned listener is closed on shutdown.
func (s *Server) Listen(addr string) (net.Listener, error) {
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
	// /file?path=<abs> serves a local file so the frontend can preview staged
	// items (e.g. image thumbnails in the notch's temporary storage). Restricted
	// to existing regular files by absolute path. CORS-open like /wallpaper.
	http.HandleFunc("/file", func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Query().Get("path")
		if !filepath.IsAbs(path) {
			http.Error(w, "absolute path required", http.StatusBadRequest)
			return
		}
		info, err := os.Stat(path)
		if err != nil || info.IsDir() {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Access-Control-Allow-Origin", "*")
		http.ServeFile(w, r, path)
	})
	// Surface and voice control now arrive over the event socket (`neoshell emit`),
	// not HTTP — see server.subscribeControlEvents and internal/eventbus.

	// The out-of-process agent backend reaches the capability registry here.
	s.registerCapabilityRoutes()

	// Serve each surface plugin's built dist at /plugins/<id>/. Registered before
	// the root frontend handler so it takes precedence.
	if s.pluginsDir != "" {
		http.HandleFunc("/plugins/", s.handlePlugin)
		log.Printf("serving plugins from %s", s.pluginsDir)
	}

	// Serve the built frontend directly when configured. Registered last and at
	// the root so the more specific /ws and /icon/ routes take precedence. WPE
	// WebKit is a full modern engine, so no compatibility shim or CSS rewriting.
	if s.frontend != "" {
		http.Handle("/", http.FileServer(http.Dir(s.frontend)))
		log.Printf("serving frontend from %s", s.frontend)
	}
	listener, err := net.Listen("tcp", addr)
	if err != nil {
		return nil, fmt.Errorf("listen on %s: %w", addr, err)
	}
	log.Printf("server listening on %s", listener.Addr())
	go func() {
		if err := http.Serve(listener, nil); err != nil && !errors.Is(err, net.ErrClosed) {
			log.Fatalf("http serve: %v", err)
		}
	}()
	return listener, nil
}

// handlePlugin serves a surface plugin's built dist at /plugins/<id>/. The path
// after the id is served from <pluginsDir>/<id>/dist, so /plugins/dock/ loads
// that plugin's index.html and /plugins/dock/assets/… its bundled assets.
func (s *Server) handlePlugin(w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(r.URL.Path, "/plugins/")
	id, _, _ := strings.Cut(rest, "/")
	if id == "" {
		http.NotFound(w, r)
		return
	}
	// Reject ids that could escape the plugins directory.
	if strings.Contains(id, "..") || strings.ContainsAny(id, `/\`) {
		http.NotFound(w, r)
		return
	}
	root := filepath.Join(s.pluginsDir, id, "dist")
	prefix := "/plugins/" + id + "/"
	http.StripPrefix(prefix, http.FileServer(http.Dir(root))).ServeHTTP(w, r)
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

	case "voice:listen":
		s.forwardVoiceControl("listen")
	case "voice:stop":
		s.forwardVoiceControl("stop")
	case "voice:cancel":
		s.forwardVoiceControl("cancel")
	case "voice:toggle":
		s.toggleVoice()

	case "agent:voice:ask":
		go s.handleVoiceAsk(c, msg)
	case "agent:voice:addressed":
		go s.handleVoiceAddressed(c, msg)
	case "agent:voice:cancel":
		s.handleVoiceCancel(msg)

	case "timer:start":
		s.timers.StartTimer(msg.Label, msg.Duration)
	case "timer:stop":
		s.timers.StopTimer(msg.ID)
	case "track:start":
		s.timers.StartTrack(msg.Label)
	case "track:stop":
		s.timers.StopTrack(msg.ID)
	case "timer:list":
		data, _ := json.Marshal(OutMessage{Type: "timer", Data: s.timers.Snapshot()})
		c.Send(data)

	case "agent:ask":
		go s.handleAgentAsk(msg.Prompt)
	case "agent:interrupt":
		go s.handleAgentInterrupt()
	case "agent:approve":
		go s.handleAgentApprove(msg.ToolUseID, msg.Result, "")
	case "agent:sync":
		s.broadcastAgentState()

	case "command:invoke":
		// Launcher entry point into the shared action registry — the same
		// actions the agent calls as tools. Name is the action; Data holds args.
		s.handleCommandInvoke(c, msg)

	case "surface:drag-start":
		// A surface (the notch) begins dragging staged files out to other apps.
		s.hub.SendDragStart(msg.Paths)

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

	case "surface:keyboard":
		// Runtime keyboard grab/release for a surface (empty name = the bar).
		name := msg.Name
		if name == "" {
			name = "bar"
		}
		s.hub.SendKeyboardMode(name, msg.Mode)

	case "relay":
		// Surface-to-surface pub/sub: rebroadcast the payload on its topic to
		// every subscriber (e.g. minimized-window pills from overlay to notch).
		if msg.Topic != "" {
			// The desktop announces its registered widget types this way. Go has
			// no other way to learn them — they are declared in the frontend's UI
			// capability registry — so snoop the payload on its way past.
			if msg.Topic == "widgets:types" {
				s.rememberWidgetTypes(msg.Data)
			}
			s.hub.Broadcast(msg.Topic, msg.Data)
		}

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
