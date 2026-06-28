// Package wallpaper bridges the neobar-bg wallpaper daemon to the WebSocket hub.
// It subscribes to the daemon's bar-strip gradient stops and rebroadcasts them
// on the "theme:bar" topic so the frontend can tint the bar to the wallpaper.
package wallpaper

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"os"
	"path/filepath"
	"time"
)

// Broadcaster publishes topic data to subscribed WebSocket clients.
type Broadcaster interface {
	Broadcast(topic string, data any)
}

const (
	topic         = "theme:bar"
	reconnectWait = 2 * time.Second
)

// daemonResponse is one newline-delimited message from the daemon.
type daemonResponse struct {
	Type  string     `json:"type"`
	Stops [][3]uint8 `json:"stops"`
}

// barColors is the payload broadcast to the frontend.
type barColors struct {
	Stops [][3]uint8 `json:"stops"`
}

// Watch connects to the daemon, subscribes to color updates, and rebroadcasts
// them. Blocks and reconnects forever; run in a goroutine. The daemon may not be
// running yet, so failures are retried quietly — only the first failure in a
// down period is logged, to avoid spamming until neobar-bg appears.
func Watch(hub Broadcaster) {
	announcedDown := false
	for {
		connected, err := stream(hub)
		if connected {
			// A live connection just ended; let the next failure log once.
			announcedDown = false
		}
		if err != nil && !announcedDown {
			log.Printf("wallpaper: neobar-bg not connected (%v); start it with `task bg`", err)
			announcedDown = true
		}
		time.Sleep(reconnectWait)
	}
}

// stream runs one connection. The bool reports whether the connection was ever
// established (so the caller can distinguish "never up" from "dropped").
func stream(hub Broadcaster) (bool, error) {
	conn, err := net.Dial("unix", socketPath())
	if err != nil {
		return false, fmt.Errorf("connect daemon: %w", err)
	}
	defer conn.Close()
	log.Printf("wallpaper: connected to neobar-bg")

	if _, err := conn.Write([]byte(`{"cmd":"subscribe"}` + "\n")); err != nil {
		return true, fmt.Errorf("subscribe: %w", err)
	}

	scanner := bufio.NewScanner(conn)
	for scanner.Scan() {
		var response daemonResponse
		if err := json.Unmarshal(scanner.Bytes(), &response); err != nil {
			continue
		}
		if response.Type == "colors" {
			hub.Broadcast(topic, barColors{Stops: response.Stops})
		}
	}
	if err := scanner.Err(); err != nil {
		return true, fmt.Errorf("read daemon: %w", err)
	}
	return true, fmt.Errorf("daemon closed the connection")
}

// SetWallpaper tells the daemon to load the image at path. Best-effort: returns
// an error if the daemon is unreachable.
func SetWallpaper(path string) error {
	conn, err := net.Dial("unix", socketPath())
	if err != nil {
		return fmt.Errorf("connect daemon: %w", err)
	}
	defer conn.Close()

	request, err := json.Marshal(map[string]string{"cmd": "img", "path": path})
	if err != nil {
		return err
	}
	if _, err := conn.Write(append(request, '\n')); err != nil {
		return fmt.Errorf("send wallpaper: %w", err)
	}
	return nil
}

func socketPath() string {
	runtime := os.Getenv("XDG_RUNTIME_DIR")
	if runtime == "" {
		runtime = fmt.Sprintf("/run/user/%d", os.Getuid())
	}
	return filepath.Join(runtime, "neobar-bg.sock")
}
