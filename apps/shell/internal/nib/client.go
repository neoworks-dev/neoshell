// Package nib is the shell's client for the nib agent backend: a supervised
// child process reached over a unix socket, one long-lived session, and an SSE
// stream translated into shell events.
//
// nib owns the conversation. The shell never assembles a prompt history or
// re-sends context — it posts user messages and reads what comes back, so the
// transcript on disk in ~/.nib/sessions stays the single source of truth.
package nib

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"
)

// ErrBusy is returned when nib refuses an extension reload because a session is
// mid-turn. The caller should retry rather than treat it as a failure.
var ErrBusy = errors.New("nib: busy")

// ErrNotFound distinguishes a missing session (so a stale id can be replaced)
// from a transport failure (where retrying is right).
var ErrNotFound = errors.New("nib: not found")

// SocketPath is where the shell asks nib to listen. A unix socket rather than a
// port: nothing on the network, no collision between instances, and no port to
// coordinate with anything else on the machine.
func SocketPath() string {
	base := os.Getenv("XDG_RUNTIME_DIR")
	if base == "" {
		base = filepath.Join("/run/user", strconv.Itoa(os.Getuid()))
	}
	return filepath.Join(base, "neoshell-nib.sock")
}

// Client speaks nib's HTTP API over a unix socket. The host in the URL is
// ignored — the dialer only ever reaches the socket — so it is a fixed
// placeholder that makes request logs readable.
type Client struct {
	http   *http.Client
	stream *http.Client
	base   string
}

func NewClient(socketPath string) *Client {
	dial := func(ctx context.Context, _, _ string) (net.Conn, error) {
		var dialer net.Dialer
		return dialer.DialContext(ctx, "unix", socketPath)
	}
	return &Client{
		http: &http.Client{
			Transport: &http.Transport{DialContext: dial},
			Timeout:   30 * time.Second,
		},
		// The event stream is open for the life of the session, so it gets a
		// transport with no response timeout at all. A Timeout here would cut
		// the stream mid-conversation.
		stream: &http.Client{Transport: &http.Transport{DialContext: dial}},
		base:   "http://nib",
	}
}

// CreateSessionRequest mirrors nib's session-creation schema. Zero fields are
// omitted so nib applies its own defaults rather than being told "".
type CreateSessionRequest struct {
	Workspace          string   `json:"workspace,omitempty"`
	Title              string   `json:"title,omitempty"`
	Provider           string   `json:"provider,omitempty"`
	Model              string   `json:"model,omitempty"`
	ThinkingLevel      string   `json:"thinkingLevel,omitempty"`
	AppendSystemPrompt string   `json:"appendSystemPrompt,omitempty"`
	ActiveTools        []string `json:"activeTools,omitempty"`
}

// Snapshot is the subset of nib's session snapshot the shell acts on.
// PendingApprovals is the important one: after a reconnect it is the only way
// to learn what the session is parked on, since the idle event does not say.
type Snapshot struct {
	ID               string   `json:"id"`
	Title            string   `json:"title"`
	Status           string   `json:"status"`
	StopReason       string   `json:"stopReason"`
	LastSeq          int      `json:"lastSeq"`
	PendingApprovals []string `json:"pendingApprovals"`
	Model            string   `json:"model"`
	Provider         string   `json:"provider"`
}

// ToolInfo describes one tool nib has registered. The display descriptor is
// what lets the notch render an extension's tool as legibly as a builtin,
// without the shell knowing anything about either.
type ToolInfo struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Policy      string `json:"policy"`
	Display     struct {
		Label string `json:"label"`
	} `json:"display"`
}

func (c *Client) Health(ctx context.Context) error {
	var body struct {
		Status string `json:"status"`
	}
	if err := c.do(ctx, http.MethodGet, "/v1/health", nil, &body); err != nil {
		return err
	}
	if body.Status != "ok" {
		return fmt.Errorf("nib: health %q", body.Status)
	}
	return nil
}

func (c *Client) CreateSession(ctx context.Context, request CreateSessionRequest) (Snapshot, error) {
	var snapshot Snapshot
	err := c.do(ctx, http.MethodPost, "/v1/sessions", request, &snapshot)
	return snapshot, err
}

func (c *Client) GetSession(ctx context.Context, id string) (Snapshot, error) {
	var snapshot Snapshot
	err := c.do(ctx, http.MethodGet, "/v1/sessions/"+id, nil, &snapshot)
	return snapshot, err
}

// PostEvents submits client events. nib accepts a batch and applies it
// all-or-nothing, so a rejected event never half-lands.
func (c *Client) PostEvents(ctx context.Context, id string, events ...ClientEvent) error {
	if len(events) == 0 {
		return nil
	}
	return c.do(ctx, http.MethodPost, "/v1/sessions/"+id+"/events", map[string]any{"events": events}, nil)
}

func (c *Client) Tools(ctx context.Context) ([]ToolInfo, error) {
	var body struct {
		Tools []ToolInfo `json:"tools"`
	}
	if err := c.do(ctx, http.MethodGet, "/v1/tools", nil, &body); err != nil {
		return nil, err
	}
	return body.Tools, nil
}

// Reload asks nib to re-read its extension directories. A 409 means a session
// is mid-turn; that is ErrBusy and worth retrying, not an error to report.
func (c *Client) Reload(ctx context.Context) error {
	return c.do(ctx, http.MethodPost, "/v1/extensions/reload", map[string]any{}, nil)
}

func (c *Client) do(ctx context.Context, method, path string, body, out any) error {
	var reader io.Reader
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("nib: encode %s: %w", path, err)
		}
		reader = bytes.NewReader(encoded)
	}

	request, err := http.NewRequestWithContext(ctx, method, c.base+path, reader)
	if err != nil {
		return err
	}
	if body != nil {
		request.Header.Set("Content-Type", "application/json")
	}

	response, err := c.http.Do(request)
	if err != nil {
		return fmt.Errorf("nib: %s %s: %w", method, path, err)
	}
	defer response.Body.Close()

	if response.StatusCode >= 400 {
		return statusError(method, path, response)
	}
	if out == nil {
		_, _ = io.Copy(io.Discard, response.Body)
		return nil
	}
	if err := json.NewDecoder(response.Body).Decode(out); err != nil {
		return fmt.Errorf("nib: decode %s: %w", path, err)
	}
	return nil
}

// statusError turns nib's uniform problem document into a Go error, preserving
// the two statuses the caller branches on.
func statusError(method, path string, response *http.Response) error {
	var problem struct {
		Error struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	_ = json.NewDecoder(response.Body).Decode(&problem)
	message := problem.Error.Message
	if message == "" {
		message = response.Status
	}
	switch response.StatusCode {
	case http.StatusConflict:
		return fmt.Errorf("%w: %s", ErrBusy, message)
	case http.StatusNotFound:
		return fmt.Errorf("%w: %s %s", ErrNotFound, method, path)
	}
	return fmt.Errorf("nib: %s %s: %s", method, path, message)
}
