package voice

import "encoding/json"

// sttClient wraps the STT sidecar, translating its JSON events into typed Go
// channels the orchestrator selects on.
type sttClient struct {
	side *sidecar

	Partials    chan string
	Finals      chan string
	SpeechStart chan struct{}
	States      chan string
	Errors      chan string
}

func newSTTClient(side *sidecar) *sttClient {
	c := &sttClient{
		side:        side,
		Partials:    make(chan string, 16),
		Finals:      make(chan string, 8),
		SpeechStart: make(chan struct{}, 8),
		States:      make(chan string, 8),
		Errors:      make(chan string, 8),
	}
	go c.readLoop()
	return c
}

func (c *sttClient) readLoop() {
	for line := range c.side.lines {
		var event sttEvent
		if err := json.Unmarshal(line, &event); err != nil {
			continue
		}
		c.dispatch(event)
	}
}

func (c *sttClient) dispatch(event sttEvent) {
	switch event.Event {
	case "partial":
		send(c.Partials, event.Text)
	case "final":
		send(c.Finals, event.Text)
	case "speech_start":
		send(c.SpeechStart, struct{}{})
	case "state":
		send(c.States, event.Value)
	case "error":
		send(c.Errors, event.Message)
	}
}

// Configure sets the STT sidecar's language, model, VAD, and listening mode.
func (c *sttClient) Configure(cmd sttCommand) error {
	cmd.Op = "config"
	return c.side.send(cmd)
}

func (c *sttClient) Listen() error { return c.side.send(sttCommand{Op: "listen"}) }
func (c *sttClient) Stop() error   { return c.side.send(sttCommand{Op: "stop"}) }
func (c *sttClient) Cancel() error { return c.side.send(sttCommand{Op: "cancel"}) }

// send is a non-blocking channel send that drops when the buffer is full, so a
// stalled consumer never blocks the sidecar reader.
func send[T any](ch chan T, value T) {
	select {
	case ch <- value:
	default:
	}
}
