package main

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/neoworks/neoshell/internal/eventbus"
)

// runEmit sends one control event to the running core's event socket, so a
// Hyprland keybind can run e.g. `neoshell emit surface:toggle dock`. An optional second
// argument carries a JSON payload (or a bare string, wrapped as JSON).
func runEmit(args []string) {
	if len(args) == 0 || args[0] == "" {
		fmt.Fprintln(os.Stderr, "usage: neoshell emit <topic> [payload]")
		os.Exit(2)
	}

	event := eventbus.Event{Topic: args[0]}
	if len(args) > 1 && args[1] != "" {
		event.Payload = encodePayload(args[1])
	}

	if err := eventbus.Emit(eventbus.SocketPath(), event); err != nil {
		fmt.Fprintf(os.Stderr, "neoshell emit %s: %v (is the shell running?)\n", event.Topic, err)
		os.Exit(1)
	}
}

// encodePayload passes valid JSON through untouched; otherwise it wraps a bare
// string as a JSON string.
func encodePayload(raw string) json.RawMessage {
	if json.Valid([]byte(raw)) {
		return json.RawMessage(raw)
	}
	wrapped, _ := json.Marshal(raw)
	return wrapped
}
