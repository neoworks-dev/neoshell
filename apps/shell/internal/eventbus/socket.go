package eventbus

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"os"
	"sync"
)

// SocketPath returns the control socket path under XDG_RUNTIME_DIR, mirroring
// renderhost.DefaultSocketPath.
func SocketPath() string {
	runtime := os.Getenv("XDG_RUNTIME_DIR")
	if runtime == "" {
		runtime = fmt.Sprintf("/run/user/%d", os.Getuid())
	}
	return runtime + "/neoshell-control.sock"
}

// Serve listens on socketPath and publishes every decoded line to bus. Blocks
// until ctx is cancelled (returns nil) or the listener errors. Replaces any
// stale socket file.
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

// clientMessage is one NDJSON line from a connected client. A line is either an
// emit (Topic set, published to the bus) or a subscribe request (Subscribe set,
// registering the connection to receive those topics back). The two are
// distinguished by which field is present, so plain emitters stay unchanged.
type clientMessage struct {
	Topic     string          `json:"topic,omitempty"`
	Payload   json.RawMessage `json:"payload,omitempty"`
	Subscribe []string        `json:"subscribe,omitempty"`
}

// serveConn reads NDJSON lines off one connection. Emit lines are published to
// the bus; subscribe lines register the connection so every matching published
// event is written back to it. A connection may do both and may subscribe
// multiple times. All subscriptions are removed when the connection closes.
func serveConn(conn net.Conn, bus *Bus) {
	defer conn.Close()

	var writeMu sync.Mutex
	var cancels []func()
	defer func() {
		for _, cancel := range cancels {
			cancel()
		}
	}()

	scanner := bufio.NewScanner(conn)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	for scanner.Scan() {
		var msg clientMessage
		if err := json.Unmarshal(scanner.Bytes(), &msg); err != nil {
			log.Printf("eventbus: bad message: %v", err)
			continue
		}
		if len(msg.Subscribe) > 0 {
			cancels = append(cancels, subscribeConn(conn, &writeMu, bus, msg.Subscribe)...)
			continue
		}
		bus.Publish(Event{Topic: msg.Topic, Payload: msg.Payload})
	}
}

// subscribeConn registers one bus handler per requested topic that writes the
// event back to conn as an NDJSON line. Returns the unsubscribe funcs. A write
// error is ignored — the read loop's scanner will end on the same broken
// connection and run the deferred unsubscribes.
func subscribeConn(conn net.Conn, writeMu *sync.Mutex, bus *Bus, topics []string) []func() {
	cancels := make([]func(), 0, len(topics))
	for _, topic := range topics {
		cancel := bus.Subscribe(topic, func(event Event) {
			raw, err := json.Marshal(event)
			if err != nil {
				return
			}
			writeMu.Lock()
			defer writeMu.Unlock()
			_, _ = conn.Write(append(raw, '\n'))
		})
		cancels = append(cancels, cancel)
	}
	return cancels
}

// Subscribe dials socketPath, registers for the given topics, and calls handler
// for every matching event until ctx is cancelled or the connection drops.
// Blocks for the connection's lifetime; callers that want auto-reconnect wrap it
// in a retry loop. Used by external processes (the AI sidecar) to receive
// activation events over the shared control socket.
func Subscribe(ctx context.Context, socketPath string, topics []string, handler Handler) error {
	conn, err := net.Dial("unix", socketPath)
	if err != nil {
		return fmt.Errorf("dial control socket: %w", err)
	}
	defer conn.Close()

	go func() {
		<-ctx.Done()
		conn.Close()
	}()

	request, err := json.Marshal(clientMessage{Subscribe: topics})
	if err != nil {
		return err
	}
	if _, err := conn.Write(append(request, '\n')); err != nil {
		return fmt.Errorf("send subscribe: %w", err)
	}

	scanner := bufio.NewScanner(conn)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	for scanner.Scan() {
		var event Event
		if err := json.Unmarshal(scanner.Bytes(), &event); err != nil {
			continue
		}
		handler(event)
	}
	if ctx.Err() != nil {
		return nil
	}
	return scanner.Err()
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
