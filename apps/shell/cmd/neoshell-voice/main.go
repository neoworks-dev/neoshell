// Command neoshell-voice is the voice pipeline: it spawns the STT and TTS
// Python sidecars, owns the microphone and the turn state machine, and connects
// to the running core over the WebSocket, where the answers come from the
// shell's shared agent session.
//
// It is a separate process because it holds the microphone and two Python model
// processes, which is exactly what "voice mode" toggles on and off. The core
// starts and stops it from voice.enabled; `task voice` runs it standalone.
package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/neoworks/neoshell/internal/config"
	"github.com/neoworks/neoshell/internal/voice"
)

func main() {
	log.SetPrefix("[neoshell-voice] ")

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	port := os.Getenv("NEOSHELL_PORT")
	if port == "" {
		port = "9876"
	}
	client := newCoreClient("ws://127.0.0.1:" + port + "/ws")
	go client.run()

	manager := voice.New(voice.Deps{
		Broadcast: client.relay,
		Responder: coreResponder{client: client},
		Config:    cfg,
	})

	// Route keybind-driven control (core forwards it as voice:control) to the
	// pipeline.
	client.onControl = func(action string) {
		switch action {
		case "listen":
			manager.StartListening()
		case "stop":
			manager.StopListening()
		case "cancel":
			manager.Cancel()
		}
	}

	manager.Start()

	// Run until interrupted, then tear down the sidecars cleanly.
	signals := make(chan os.Signal, 1)
	signal.Notify(signals, syscall.SIGINT, syscall.SIGTERM)
	<-signals
	log.Printf("shutting down")
	manager.Stop()
}
