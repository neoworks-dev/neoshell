package hyprland

import (
	"bufio"
	"log"
	"net"
	"strings"
	"time"
)

// Types

type Workspace struct {
	ID              int    `json:"id"`
	Name            string `json:"name"`
	Monitor         string `json:"monitor"`
	MonitorID       int    `json:"monitorId"`
	Windows         int    `json:"windows"`
	HasFullscreen   bool   `json:"hasfullscreen"`
	LastWindow      string `json:"lastwindow"`
	LastWindowTitle string `json:"lastwindowtitle"`
	IsPersistent    bool   `json:"ispersistent"`
	TiledLayout     string `json:"tiledlayout"`
}

type WorkspaceRef struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type Window struct {
	Address          string       `json:"address"`
	Mapped           bool         `json:"mapped"`
	Hidden           bool         `json:"hidden"`
	At               [2]int       `json:"at"`
	Size             [2]int       `json:"size"`
	Workspace        WorkspaceRef `json:"workspace"`
	Floating         bool         `json:"floating"`
	Monitor          int          `json:"monitor"`
	Class            string       `json:"class"`
	Title            string       `json:"title"`
	InitialClass     string       `json:"initialClass"`
	InitialTitle     string       `json:"initialTitle"`
	PID              int          `json:"pid"`
	Xwayland         bool         `json:"xwayland"`
	Pinned           bool         `json:"pinned"`
	Fullscreen       int          `json:"fullscreen"`
	FullscreenClient int          `json:"fullscreenClient"`
	OverFullscreen   bool         `json:"overFullscreen"`
	Grouped          []string     `json:"grouped"`
	Tags             []string     `json:"tags"`
	Swallowing       string       `json:"swallowing"`
	FocusHistoryID   int          `json:"focusHistoryID"`
	InhibitingIdle   bool         `json:"inhibitingIdle"`
	XDGTag           string       `json:"xdgTag"`
	XDGDescription   string       `json:"xdgDescription"`
	ContentType      string       `json:"contentType"`
	StableID         string       `json:"stableId"`
}

type Monitor struct {
	ID                     int          `json:"id"`
	Name                   string       `json:"name"`
	Description            string       `json:"description"`
	Make                   string       `json:"make"`
	Model                  string       `json:"model"`
	Serial                 string       `json:"serial"`
	Width                  int          `json:"width"`
	Height                 int          `json:"height"`
	PhysicalWidth          int          `json:"physicalWidth"`
	PhysicalHeight         int          `json:"physicalHeight"`
	RefreshRate            float64      `json:"refreshRate"`
	X                      int          `json:"x"`
	Y                      int          `json:"y"`
	ActiveWorkspace        WorkspaceRef `json:"activeWorkspace"`
	SpecialWorkspace       WorkspaceRef `json:"specialWorkspace"`
	Reserved               [4]int       `json:"reserved"`
	Scale                  float64      `json:"scale"`
	Transform              int          `json:"transform"`
	Focused                bool         `json:"focused"`
	DPMSStatus             bool         `json:"dpmsStatus"`
	VRR                    bool         `json:"vrr"`
	Solitary               string       `json:"solitary"`
	SolitaryBlockedBy      []string     `json:"solitaryBlockedBy"`
	ActivelyTearing        bool         `json:"activelyTearing"`
	TearingBlockedBy       []string     `json:"tearingBlockedBy"`
	DirectScanoutTo        string       `json:"directScanoutTo"`
	DirectScanoutBlockedBy []string     `json:"directScanoutBlockedBy"`
	Disabled               bool         `json:"disabled"`
	CurrentFormat          string       `json:"currentFormat"`
	MirrorOf               string       `json:"mirrorOf"`
	AvailableModes         []string     `json:"availableModes"`
	ColorManagementPreset  string       `json:"colorManagementPreset"`
	SDRBrightness          float64      `json:"sdrBrightness"`
	SDRSaturation          float64      `json:"sdrSaturation"`
	SDRMinLuminance        float64      `json:"sdrMinLuminance"`
	SDRMaxLuminance        float64      `json:"sdrMaxLuminance"`
}

type Broadcaster interface {
	Broadcast(topic string, data any)
}

// EventLoop connects to socket2 and broadcasts events to the hub.
// Reconnects automatically if the socket drops.
func (c *Client) EventLoop(hub Broadcaster) {
	for {
		if err := c.runEventLoop(hub); err != nil {
			log.Printf("hyprland event loop error: %v — retrying in 2s", err)
		}
		time.Sleep(2 * time.Second)
	}
}

func (c *Client) runEventLoop(hub Broadcaster) error {
	conn, err := net.Dial("unix", c.socket2Path)
	if err != nil {
		return err
	}
	defer conn.Close()

	// hydrate initial state on (re)connect
	c.pushInitialState(hub)

	scanner := bufio.NewScanner(conn)
	for scanner.Scan() {
		line := scanner.Text()
		parts := strings.SplitN(line, ">>", 2)
		if len(parts) != 2 {
			continue
		}
		event, data := parts[0], parts[1]
		c.handleEvent(hub, event, data)
	}

	return scanner.Err()
}

func (c *Client) pushInitialState(hub Broadcaster) {
	if ws, err := c.Workspaces(); err == nil {
		hub.Broadcast("hyprland:workspaces", ws)
	}
	if aw, err := c.ActiveWorkspace(); err == nil {
		hub.Broadcast("hyprland:activeworkspace", aw)
	}
	if win, err := c.ActiveWindow(); err == nil {
		hub.Broadcast("hyprland:activewindow", win)
	}
	if wins, err := c.Windows(); err == nil {
		hub.Broadcast("hyprland:windows", wins)
	}
}

func (c *Client) handleEvent(hub Broadcaster, event, data string) {
	switch event {
	case "workspace", "focusedmon":
		if ws, err := c.Workspaces(); err == nil {
			hub.Broadcast("hyprland:workspaces", ws)
		}
		if aw, err := c.ActiveWorkspace(); err == nil {
			hub.Broadcast("hyprland:activeworkspace", aw)
		}

	case "activewindow", "closewindow":
		if win, err := c.ActiveWindow(); err == nil {
			hub.Broadcast("hyprland:activewindow", win)
		}
		if wins, err := c.Windows(); err == nil {
			hub.Broadcast("hyprland:windows", wins)
		}

	case "openwindow", "movewindow":
		if ws, err := c.Workspaces(); err == nil {
			hub.Broadcast("hyprland:workspaces", ws)
		}
		if aw, err := c.ActiveWorkspace(); err == nil {
			hub.Broadcast("hyprland:activeworkspace", aw)
		}

	case "monitoradded", "monitorremoved":
		if monitors, err := c.Monitors(); err == nil {
			hub.Broadcast("hyprland:monitors", monitors)
		}

	default:
		// forward raw events the SDK can optionally listen to
		hub.Broadcast("hyprland:event", map[string]string{
			"event": event,
			"data":  data,
		})
	}
}
