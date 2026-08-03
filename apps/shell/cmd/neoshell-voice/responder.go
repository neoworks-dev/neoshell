package main

import (
	"context"
	"fmt"

	"github.com/neoworks/neoshell/internal/voice"
)

// coreResponder implements voice.Responder by round-tripping each turn to the
// neoshell core over the WebSocket. The core holds the agent session and every
// tool it can reach, so this daemon stays a microphone and a speaker.
type coreResponder struct {
	client *coreClient
}

// Addressed asks the core whether an utterance was directed at the assistant.
// Fails open: a gate that cannot be reached must not make the assistant deaf.
func (r coreResponder) Addressed(ctx context.Context, text string) bool {
	id, events, err := r.client.agentRequest("addressed", text)
	if err != nil {
		return true
	}
	defer r.client.finishAgent(id)
	for {
		select {
		case <-ctx.Done():
			r.client.cancelAgent(id)
			return true
		case ev, ok := <-events:
			if !ok {
				return true
			}
			if ev.kind == "done" {
				addressed, present := ev.done["addressed"].(bool)
				if !present {
					return true
				}
				return addressed
			}
		}
	}
}

// Reply runs one agent turn, streaming the answer as it is produced.
//
// A cancelled ctx is a barge-in: the user has started talking over the reply.
// Cancelling the agent turn is what makes that stick — without it the backend
// would keep working and keep sending tokens at a speaker that has gone quiet.
func (r coreResponder) Reply(ctx context.Context, prompt string, onToken, onStatus func(string)) (voice.Result, error) {
	id, events, err := r.client.agentRequest("ask", prompt)
	if err != nil {
		return voice.Result{}, err
	}
	defer r.client.finishAgent(id)

	var result voice.Result
	for {
		select {
		case <-ctx.Done():
			r.client.cancelAgent(id)
			return result, ctx.Err()
		case ev, ok := <-events:
			if !ok {
				return result, fmt.Errorf("voice: core stream closed")
			}
			switch ev.kind {
			case "token":
				if onToken != nil {
					onToken(ev.token)
				}
			case "status":
				if onStatus != nil {
					onStatus(ev.status)
				}
			case "done":
				if text, ok := ev.done["text"].(string); ok {
					result.Text = text
				}
				result.Sources = decodeSources(ev.done["sources"])
				if message, ok := ev.done["error"].(string); ok && message != "" {
					return result, fmt.Errorf("voice: %s", message)
				}
				return result, nil
			}
		}
	}
}

// decodeSources converts the JSON sources array from a done payload into typed
// voice.Source values.
func decodeSources(raw any) []voice.Source {
	list, ok := raw.([]any)
	if !ok {
		return nil
	}
	sources := make([]voice.Source, 0, len(list))
	for _, item := range list {
		entry, ok := item.(map[string]any)
		if !ok {
			continue
		}
		path, _ := entry["path"].(string)
		name, _ := entry["name"].(string)
		sources = append(sources, voice.Source{Path: path, Name: name})
	}
	if len(sources) == 0 {
		return nil
	}
	return sources
}
