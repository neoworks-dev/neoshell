package server

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/neoworks/neoshell/internal/capability"
	"github.com/neoworks/neoshell/internal/widgets"
)

// The capability HTTP surface is how an out-of-process agent host reaches the
// same actions the launcher invokes over the WebSocket. It is deliberately
// tiny: one route to discover what exists, one to run it.
//
// Two things guard it. The listener binds loopback only (see main.go), and
// every request must carry the bearer token minted at startup and handed to the
// agent process in its environment — so a stray page in a browser on this
// machine cannot drive the desktop just because it can reach localhost.

// AgentToken is the per-process shared secret for the capability routes. It is
// generated once and passed to the agent backend as NEOSHELL_TOKEN.
var agentToken = mintToken()

// AgentToken returns the token to hand to a spawned agent backend.
func AgentToken() string { return agentToken }

func mintToken() string {
	// An explicit token lets a developer curl the routes by hand without
	// scraping the process environment.
	if fromEnv := os.Getenv("NEOSHELL_TOKEN"); fromEnv != "" {
		return fromEnv
	}
	buffer := make([]byte, 32)
	if _, err := rand.Read(buffer); err != nil {
		// A shell that cannot generate a secret must not fall back to a
		// predictable one — that would be worse than having no route at all.
		log.Fatalf("capability token: %v", err)
	}
	return hex.EncodeToString(buffer)
}

// authorized checks the bearer token in constant time.
func authorized(r *http.Request) bool {
	const prefix = "Bearer "
	header := r.Header.Get("Authorization")
	if len(header) <= len(prefix) || header[:len(prefix)] != prefix {
		return false
	}
	got := header[len(prefix):]
	return subtle.ConstantTimeCompare([]byte(got), []byte(agentToken)) == 1
}

// actionSpec is the wire shape of one action. It carries everything an agent
// host needs to build a tool: a name to call back with, prose for the model,
// the parameter schema, and how the action wants to be gated.
type actionSpec struct {
	Name        string               `json:"name"`
	Tool        string               `json:"tool"`
	Description string               `json:"description"`
	Policy      string               `json:"policy"`
	Params      map[string]paramSpec `json:"params"`
	Schema      map[string]any       `json:"schema"`
}

type paramSpec struct {
	Type        string `json:"type"`
	Description string `json:"description"`
	Required    bool   `json:"required"`
}

func (s *Server) registerCapabilityRoutes() {
	http.HandleFunc("/capabilities", s.handleCapabilities)
	http.HandleFunc("/capabilities/invoke", s.handleCapabilityInvoke)
}

func (s *Server) handleCapabilities(w http.ResponseWriter, r *http.Request) {
	if !authorized(r) {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	// Gating happens here rather than at invoke time alone, so a disabled
	// capability never appears in the agent's tool list to begin with.
	actions := s.registry.Actions(s.capabilityEnabled)
	specs := make([]actionSpec, 0, len(actions))
	for _, action := range actions {
		params := make(map[string]paramSpec, len(action.Params))
		for name, spec := range action.Params {
			params[name] = paramSpec{Type: spec.Type, Description: spec.Description, Required: spec.Required}
		}
		specs = append(specs, actionSpec{
			Name:        action.Name,
			Tool:        capability.ToolName(action.Name),
			Description: action.Description,
			Policy:      string(action.EffectivePolicy()),
			Params:      params,
			Schema:      action.JSONSchema(),
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"actions": specs})
}

func (s *Server) handleCapabilityInvoke(w http.ResponseWriter, r *http.Request) {
	if !authorized(r) {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var request struct {
		Name      string         `json:"name"`
		Arguments map[string]any `json:"arguments"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid request body"})
		return
	}
	if request.Arguments == nil {
		request.Arguments = map[string]any{}
	}

	result, err := s.invokeAction(r.Context(), request.Name, request.Arguments)
	if err != nil {
		// A failed action is a normal outcome the model must be able to read and
		// recover from, not a transport error — 200 with an error field.
		writeJSON(w, http.StatusOK, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"text":    result.Text,
		"sources": result.Sources,
	})
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		log.Printf("capabilities: write response: %v", err)
	}
}

// rememberWidgetTypes caches the desktop surface's announced widget types.
func (s *Server) rememberWidgetTypes(payload json.RawMessage) {
	var announcement struct {
		Types []widgets.Type `json:"types"`
	}
	if err := json.Unmarshal(payload, &announcement); err != nil {
		log.Printf("widgets:types: %v", err)
		return
	}
	s.widgetMu.Lock()
	s.widgetTypes = announcement.Types
	s.widgetMu.Unlock()
}

func (s *Server) knownWidgetTypes() []widgets.Type {
	s.widgetMu.Lock()
	defer s.widgetMu.Unlock()
	return s.widgetTypes
}
