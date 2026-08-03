// Command neoshell-probe exercises the shell's assistant stack without taking
// over the screen.
//
// It brings up the HTTP and WebSocket surface — capabilities, the registry, the
// agent supervisor — but no render host and no layer-shell surfaces, so it can
// run against a live Hyprland session while you are using it.
//
//	neoshell-probe                    serve the capability routes on :9899
//	SMOKE_AGENT=1 neoshell-probe      …and supervise the agent backend too
//	neoshell-probe ask "<prompt>"     drive one turn against a running backend
//
// Set NEOSHELL_TOKEN to a known value to curl the capability routes by hand.
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"

	"github.com/neoworks/neoshell/internal/agentd"
	"github.com/neoworks/neoshell/internal/config"
	"github.com/neoworks/neoshell/internal/eventbus"
	"github.com/neoworks/neoshell/internal/fileindex"
	"github.com/neoworks/neoshell/internal/hyprland"
	"github.com/neoworks/neoshell/internal/server"
	"github.com/neoworks/neoshell/internal/system"
)

func main() {
	if len(os.Args) > 2 && os.Args[1] == "ask" {
		runAgentTurn(strings.Join(os.Args[2:], " "))
		return
	}

	port := 9899
	if raw := os.Getenv("SMOKE_PORT"); raw != "" {
		port, _ = strconv.Atoi(raw)
	}

	hypr, err := hyprland.NewClient()
	if err != nil {
		log.Fatalf("hyprland: %v", err)
	}
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	hub := server.NewHub()
	srv := server.New(hub, eventbus.New(), hypr, system.New(), cfg, nil, fileindex.New(), "", "")

	go hub.Run()
	listener, err := srv.Listen(fmt.Sprintf("127.0.0.1:%d", port))
	if err != nil {
		log.Fatalf("listen: %v", err)
	}
	defer listener.Close()

	// Optional: let the harness own the agent backend too, so the supervisor's
	// spawn, health poll, session attach, and shutdown all run for real.
	if os.Getenv("SMOKE_AGENT") != "" {
		ctx, stop := context.WithCancel(context.Background())
		defer stop()
		agentd.Start(ctx, srv, hub, cfg, port)
	}

	fmt.Printf("READY token=%s port=%d\n", server.AgentToken(), port)

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
}
