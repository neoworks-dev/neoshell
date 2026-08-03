package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/neoworks/neoshell/internal/nib"
)

// runAgentTurn drives one real turn through internal/nib against an already
// running backend, printing what a surface would see. `capsmoke ask "<prompt>"`.
func runAgentTurn(prompt string) {
	client := nib.NewClient(nib.SocketPath())
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()

	if err := client.Health(ctx); err != nil {
		log.Fatalf("health: %v", err)
	}
	tools, err := client.Tools(ctx)
	if err != nil {
		log.Fatalf("tools: %v", err)
	}
	desktop := 0
	for _, tool := range tools {
		if strings.HasPrefix(tool.Name, "neoshell_") {
			desktop++
		}
	}
	fmt.Printf("tools: %d total, %d neoshell_*\n", len(tools), desktop)

	session, err := nib.Open(ctx, client, nib.CreateSessionRequest{
		Workspace:          os.Getenv("HOME"),
		Title:              "capsmoke",
		AppendSystemPrompt: desktopSmokePrompt,
	}, "")
	if err != nil {
		log.Fatalf("open: %v", err)
	}
	fmt.Printf("session %s\n", session.ID())

	start := time.Now()
	firstEvent := time.Duration(-1)
	done := make(chan struct{})
	var reply strings.Builder

	session.Subscribe(func(event nib.Event) {
		if firstEvent < 0 {
			firstEvent = time.Since(start)
		}
		switch event.Type {
		case nib.EventMessageDelta:
			reply.WriteString(event.Text)
		case nib.EventToolUse:
			fmt.Printf("  TOOL  %s perm=%s input=%s\n", event.Name, event.Permission, truncate(string(event.Input), 100))
			if event.Permission == "ask" {
				// Wait a beat so the parked state is observable, then answer
				// the oldest pending call — exactly what the keybind does.
				go func() {
					time.Sleep(300 * time.Millisecond)
					fmt.Printf("        parked: status=%s pending=%d\n",
						session.State().Status, len(session.State().Approvals))
					verdict := nib.ApproveOnce
					if os.Getenv("SMOKE_DENY") != "" {
						verdict = nib.ApproveDeny
					}
					if err := session.ConfirmOldest(ctx, verdict); err != nil {
						fmt.Printf("        answer failed: %v\n", err)
						return
					}
					fmt.Printf("        answered %s\n", verdict)
				}()
			}
		case nib.EventToolResult:
			fmt.Printf("  RESULT %s err=%v %s\n", event.Name, event.IsError, truncate(nib.ResultText(event.Content), 120))
		case nib.EventStatusIdle:
			fmt.Printf("  IDLE  %s (status=%s)\n", event.StopReason, session.State().Status)
			if event.StopReason != nib.IdleRequiresAction {
				select {
				case <-done:
				default:
					close(done)
				}
			}
		case nib.EventError:
			fmt.Printf("  ERROR %s\n", event.Message)
		}
	})

	go session.Run(ctx)
	// The stream is already open, so the message can go straight out; there is
	// no handshake to wait for and no keepalive stall to eat.
	if err := session.Ask(ctx, prompt, nib.DeliverSteer); err != nil {
		log.Fatalf("ask: %v", err)
	}

	select {
	case <-done:
	case <-ctx.Done():
		fmt.Println("timed out")
	}
	fmt.Printf("\nfirst event %.2fs, total %.2fs\n", firstEvent.Seconds(), time.Since(start).Seconds())
	fmt.Printf("REPLY: %s\n", strings.TrimSpace(reply.String()))
}

func truncate(value string, limit int) string {
	value = strings.ReplaceAll(value, "\n", " ")
	if len(value) <= limit {
		return value
	}
	return value[:limit] + "…"
}

const desktopSmokePrompt = "You are embedded in a desktop shell. Answer in one short sentence, no markdown. Use the neoshell_* tools to inspect and control the desktop."
