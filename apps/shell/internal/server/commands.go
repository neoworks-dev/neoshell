package server

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/neoworks/neoshell/internal/capability"
)

// invokeAction is the single entry point into the shared capability registry.
// Every caller goes through it — the launcher over the WebSocket, and the agent
// backend over HTTP — so a capability behaves identically whichever asked, and
// the plugins.providers gate is enforced in exactly one place.
func (s *Server) invokeAction(ctx context.Context, name string, arguments map[string]any) (capability.Result, error) {
	if name == "" {
		return capability.Result{}, fmt.Errorf("no action name")
	}
	if !s.registry.Has(name) {
		return capability.Result{}, fmt.Errorf("unknown action %q", name)
	}
	if !s.capabilityEnabled(s.registry.Owner(name)) {
		return capability.Result{}, fmt.Errorf("action %q is disabled", name)
	}
	return s.registry.Invoke(ctx, name, arguments)
}

// capabilityEnabled gates a capability by the same plugins.providers toggle that
// controls its launcher provider, so disabling a feature withdraws it from the
// agent's tool list too.
func (s *Server) capabilityEnabled(capabilityID string) bool {
	return s.cfgBool("plugins.providers."+capabilityID, true)
}

// handleCommandInvoke runs a launcher command against the shared registry and
// replies to the requesting client with the outcome.
func (s *Server) handleCommandInvoke(c *Client, msg InMessage) {
	arguments := map[string]any{}
	if len(msg.Data) > 0 {
		if err := json.Unmarshal(msg.Data, &arguments); err != nil {
			s.sendCommandResult(c, msg.Name, "", "invalid arguments")
			return
		}
	}
	result, err := s.invokeAction(context.Background(), msg.Name, arguments)
	if err != nil {
		s.sendCommandResult(c, msg.Name, "", err.Error())
		return
	}
	s.sendCommandResult(c, msg.Name, result.Text, "")
}

func (s *Server) sendCommandResult(c *Client, name, text, errText string) {
	data, _ := json.Marshal(OutMessage{Type: "command:result", Data: map[string]any{
		"name":  name,
		"text":  text,
		"error": errText,
	}})
	c.Send(data)
}
