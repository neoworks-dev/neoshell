// Package searchd is the neoshell semantic file-search daemon: it watches the
// home directory, indexes file contents into SurrealDB (BM25 + vector), and
// answers hybrid queries over a unix-socket control protocol. The Go core dials
// the same socket to back the `search:files` WS route.
package searchd

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"net"
	"os"
)

// Hit is one search result returned to the core (and on to the UI). It mirrors
// the fields the `searchResults` WS topic carries.
type Hit struct {
	Path     string  `json:"path"`
	Name     string  `json:"name"`
	IsDir    bool    `json:"isDir"`
	Score    float64 `json:"score"`
	Snippet  string  `json:"snippet,omitempty"`
	Modality string  `json:"modality,omitempty"` // "text" | "image"
}

// Request is a control-socket command. Newline-delimited JSON, one per line.
type Request struct {
	Op    string `json:"op"` // "query" | "rerank" | "ping" | "progress"
	Text  string `json:"text,omitempty"`
	Limit int    `json:"limit,omitempty"`
	// Candidates are the file paths to reorder for the "rerank" op.
	Candidates []string `json:"candidates,omitempty"`
}

// Response is the reply to a Request.
type Response struct {
	Hits     []Hit         `json:"hits,omitempty"`
	Progress *ProgressInfo `json:"progress,omitempty"`
	Error    string        `json:"error,omitempty"`
}

// SocketPath returns the control socket path under XDG_RUNTIME_DIR.
func SocketPath() string {
	runtime := os.Getenv("XDG_RUNTIME_DIR")
	if runtime == "" {
		runtime = fmt.Sprintf("/run/user/%d", os.Getuid())
	}
	return runtime + "/neoshell-search.sock"
}

// Handler answers a parsed request.
type Handler func(Request) Response

// Serve listens on the control socket and dispatches each request to handler.
// Blocks until ctx is cancelled (then returns nil) or the listener errors, so the
// caller can run deferred cleanup (e.g. a final index save). Replaces any stale
// socket file.
func Serve(ctx context.Context, socketPath string, handler Handler) error {
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
		go serveConn(conn, handler)
	}
}

func serveConn(conn net.Conn, handler Handler) {
	defer conn.Close()
	scanner := bufio.NewScanner(conn)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	for scanner.Scan() {
		var request Request
		if err := json.Unmarshal(scanner.Bytes(), &request); err != nil {
			writeResponse(conn, Response{Error: "bad request: " + err.Error()})
			continue
		}
		writeResponse(conn, handler(request))
	}
}

func writeResponse(conn net.Conn, response Response) {
	raw, err := json.Marshal(response)
	if err != nil {
		return
	}
	raw = append(raw, '\n')
	_, _ = conn.Write(raw)
}

// QuerySocket dials the daemon, sends one request, and returns its response. Used
// by the core and by the `query` CLI subcommand.
func QuerySocket(socketPath string, request Request) (Response, error) {
	conn, err := net.Dial("unix", socketPath)
	if err != nil {
		return Response{}, fmt.Errorf("dial search daemon: %w", err)
	}
	defer conn.Close()

	raw, err := json.Marshal(request)
	if err != nil {
		return Response{}, err
	}
	if _, err := conn.Write(append(raw, '\n')); err != nil {
		return Response{}, err
	}

	scanner := bufio.NewScanner(conn)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	if !scanner.Scan() {
		if err := scanner.Err(); err != nil {
			return Response{}, err
		}
		return Response{}, fmt.Errorf("search daemon closed connection")
	}
	var response Response
	if err := json.Unmarshal(scanner.Bytes(), &response); err != nil {
		return Response{}, err
	}
	return response, nil
}
