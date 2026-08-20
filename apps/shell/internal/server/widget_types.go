package server

import (
	"encoding/json"
	"log"

	"github.com/neoworks/neoshell/internal/widgets"
)

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
