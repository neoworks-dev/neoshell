package eventbus

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"os"
)

// SocketPath returns the control socket path under XDG_RUNTIME_DIR, mirroring
// searchd.SocketPath / renderhost.DefaultSocketPath.
func SocketPath() string {
	runtime := os.Getenv("XDG_RUNTIME_DIR")
	if runtime == "" {
		runtime = fmt.Sprintf("/run/user/%d", os.Getuid())
	}
	return runtime + "/neoshell-control.sock"
}

// Serve listens on socketPath and publishes every decoded line to bus. Blocks
// until ctx is cancelled (returns nil) or the listener errors. Replaces any
// stale socket file. Mirrors searchd.Serve.
func Serve(ctx context.Context, socketPath string, bus *Bus) error {
	_ = os.Remove(socketPath)
	listener, err := net.Listen("unix", socketPath)
	if err != nil {
		return fmt.Errorf("listen %s: %w", socketPath, err)
	}
	defer listener.Close()

	// Unblock Accept on shutdown by closing the listener.
	go func() {
		<-ctx.Done()
		listener.Close()
	}()

	for {
		conn, err := listener.Accept()
		if err != nil {
			if ctx.Err() != nil {
				return nil // graceful shutdown
			}
			return err
		}
		go serveConn(conn, bus)
	}
}

// serveConn reads NDJSON events off one connection and publishes them. Emit is
// one-way, so nothing is written back; the connection stays open until the
// client closes it, allowing a client to stream multiple events.
func serveConn(conn net.Conn, bus *Bus) {
	defer conn.Close()
	scanner := bufio.NewScanner(conn)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	for scanner.Scan() {
		var event Event
		if err := json.Unmarshal(scanner.Bytes(), &event); err != nil {
			log.Printf("eventbus: bad event: %v", err)
			continue
		}
		bus.Publish(event)
	}
}

// Emit dials socketPath, writes one NDJSON Event line, and returns. Used by the
// `neoshell emit` CLI subcommand.
func Emit(socketPath string, event Event) error {
	conn, err := net.Dial("unix", socketPath)
	if err != nil {
		return fmt.Errorf("dial control socket: %w", err)
	}
	defer conn.Close()

	raw, err := json.Marshal(event)
	if err != nil {
		return err
	}
	if _, err := conn.Write(append(raw, '\n')); err != nil {
		return err
	}
	return nil
}
