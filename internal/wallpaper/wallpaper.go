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
// running yet, so connection failures are retried rather than fatal.
func Watch(hub Broadcaster) {
	for {
		if err := stream(hub); err != nil {
			log.Printf("wallpaper: %v (retrying in %s)", err, reconnectWait)
		}
		time.Sleep(reconnectWait)
	}
}

func stream(hub Broadcaster) error {
	conn, err := net.Dial("unix", socketPath())
	if err != nil {
		return fmt.Errorf("connect daemon: %w", err)
	}
	defer conn.Close()

	if _, err := conn.Write([]byte(`{"cmd":"subscribe"}` + "\n")); err != nil {
		return fmt.Errorf("subscribe: %w", err)
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
		return fmt.Errorf("read daemon: %w", err)
	}
	return fmt.Errorf("daemon closed the connection")
}

func socketPath() string {
	runtime := os.Getenv("XDG_RUNTIME_DIR")
	if runtime == "" {
		runtime = fmt.Sprintf("/run/user/%d", os.Getuid())
	}
	return filepath.Join(runtime, "neobar-bg.sock")
}
