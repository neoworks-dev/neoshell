package voice

import (
	"context"
	"encoding/json"
	"strings"
)

// ttsClient wraps the TTS sidecar. It speaks whole sentences (fed by the
// orchestrator) and reports when a turn's audio starts and drains.
type ttsClient struct {
	side *sidecar

	SpeakingStart chan string // carries the gen id
	Idle          chan string // carries the gen id
	Errors        chan string
}

func newTTSClient(side *sidecar) *ttsClient {
	c := &ttsClient{
		side:          side,
		SpeakingStart: make(chan string, 8),
		Idle:          make(chan string, 8),
		Errors:        make(chan string, 8),
	}
	go c.readLoop()
	return c
}

func (c *ttsClient) readLoop() {
	for line := range c.side.lines {
		var event ttsEvent
		if err := json.Unmarshal(line, &event); err != nil {
			continue
		}
		switch event.Event {
		case "speaking_start":
			send(c.SpeakingStart, event.Gen)
		case "idle":
			send(c.Idle, event.Gen)
		case "error":
			send(c.Errors, event.Message)
		}
	}
}

func (c *ttsClient) Configure(refAudio, voice, language string) error {
	return c.side.send(ttsCommand{Op: "config", RefAudio: refAudio, Voice: voice, Language: language})
}

func (c *ttsClient) Speak(gen, text string) error {
	if strings.TrimSpace(text) == "" {
		return nil
	}
	return c.side.send(ttsCommand{Op: "speak", Gen: gen, Text: text})
}

// Flush drops queued and in-flight audio for a turn (interrupt / barge-in).
func (c *ttsClient) Flush(gen string) error {
	return c.side.send(ttsCommand{Op: "flush", Gen: gen})
}

// waitIdle blocks until the TTS sidecar reports the given turn's queue drained,
// or ctx is cancelled. Only one turn speaks at a time, so idle events belong to
// the active gen.
func (c *ttsClient) waitIdle(ctx context.Context, gen string) {
	for {
		select {
		case <-ctx.Done():
			return
		case idleGen := <-c.Idle:
			if idleGen == gen {
				return
			}
		}
	}
}
