package server

import (
	"context"
	"encoding/json"
	"fmt"
	"path/filepath"
	"strings"

	"github.com/neoworks/neoshell/internal/ai"
	"github.com/neoworks/neoshell/internal/apps"
	"github.com/neoworks/neoshell/internal/capability"
	"github.com/neoworks/neoshell/internal/searchd"
)

// maxToolRounds bounds the tool-use loop so a confused model can't spin forever.
const maxToolRounds = 4

// chatTools are the actions the model may call. The built-in file tools
// (search/read/open) need per-request streaming state, so they stay hardcoded;
// everything else is generated from the shared capability registry, so the AI
// gains reach over exactly what the launcher exposes — enabled capabilities
// only.
func (s *Server) chatTools() []ai.ToolSpec {
	stringParam := func(description string) map[string]any {
		return map[string]any{"type": "string", "description": description}
	}
	object := func(name string, prop map[string]any) map[string]any {
		return map[string]any{
			"type":       "object",
			"properties": map[string]any{name: prop},
			"required":   []string{name},
		}
	}
	tools := []ai.ToolSpec{
		{Type: "function", Function: ai.ToolFunction{
			Name:        "search_files",
			Description: "Search the user's indexed files by keyword or natural language. Returns matching file paths.",
			Parameters:  object("query", stringParam("What to search for.")),
		}},
		{Type: "function", Function: ai.ToolFunction{
			Name:        "read_file",
			Description: "Read the text contents of a file by absolute path.",
			Parameters:  object("path", stringParam("Absolute path of the file to read.")),
		}},
		{Type: "function", Function: ai.ToolFunction{
			Name:        "open_file",
			Description: "Open a file in the user's default application.",
			Parameters:  object("path", stringParam("Absolute path of the file to open.")),
		}},
	}
	// Escalation to a more capable expert AI. Opt-in per turn — the model calls
	// this only for genuinely hard tasks; its answer replaces the local one.
	if s.cfgBool("ai.escalate.enabled", true) {
		tools = append(tools, ai.ToolSpec{Type: "function", Function: ai.ToolFunction{
			Name:        "ask_expert",
			Description: "Delegate a genuinely complex task to a more capable expert AI (deep reasoning, coding, multi-step research). Use ONLY when the task is beyond your ability — never for simple questions. Pass the full question with all context.",
			Parameters:  object("question", stringParam("The complete question to delegate, including all context the expert needs.")),
		}})
	}
	for _, action := range s.registry.Actions(s.capabilityEnabled) {
		tools = append(tools, ai.ToolSpec{Type: "function", Function: ai.ToolFunction{
			Name:        capability.ToolName(action.Name),
			Description: action.Description,
			Parameters:  action.JSONSchema(),
		}})
	}
	return tools
}

// capabilityEnabled gates a capability by the same plugins.providers toggle that
// controls its launcher provider, so disabling a feature hides it from the AI too.
func (s *Server) capabilityEnabled(capabilityID string) bool {
	return s.cfgBool("plugins.providers."+capabilityID, true)
}

// runToolLoop lets the model call tools before it answers. Each round it asks for
// tool calls (non-streaming); if it makes any, they run server-side and their
// results feed back as an observation message. It stops when the model asks for
// no more tools, the round cap is hit, or the request is cancelled.
//
// A non-empty expert return means the model delegated to ask_expert: that answer
// is authoritative and the caller should speak/stream it instead of running a
// final local generation.
func (s *Server) runToolLoop(ctx context.Context, statusFn func(string), cfg ai.Config, messages []ai.Message, sources []source) (outMessages []ai.Message, outSources []source, expert string) {
	tools := s.chatTools()
	for round := 0; round < maxToolRounds; round++ {
		if ctx.Err() != nil {
			return messages, sources, ""
		}
		completion, err := ai.Complete(ctx, cfg, messages, tools)
		if err != nil || len(completion.ToolCalls) == 0 {
			return messages, sources, ""
		}

		// Escalation short-circuits the loop: a successful expert answer is
		// returned directly; a failure leaves a note so the model answers itself.
		if answer, asked := s.handleExpertCalls(ctx, statusFn, completion.ToolCalls); asked {
			if answer != "" {
				return messages, sources, answer
			}
			messages = append(messages, ai.Message{
				Role:    "user",
				Content: "Tool results:\nask_expert → the expert is unavailable; answer the request yourself.\n",
			})
			continue
		}

		var observations strings.Builder
		for _, call := range completion.ToolCalls {
			result, callSources := s.execTool(ctx, statusFn, call)
			sources = append(sources, callSources...)
			fmt.Fprintf(&observations, "%s(%s) →\n%s\n\n", call.Name, argSummary(call.Arguments), result)
		}
		messages = append(messages, ai.Message{
			Role:    "user",
			Content: "Tool results:\n" + observations.String() + "Use these results to answer.",
		})
	}
	return messages, sources, ""
}

// handleExpertCalls runs an ask_expert delegation if present. It reports whether
// the model asked for the expert (so the caller skips normal tool handling that
// round) and the expert's answer, if any.
func (s *Server) handleExpertCalls(ctx context.Context, statusFn func(string), calls []ai.ToolCall) (answer string, asked bool) {
	for _, call := range calls {
		if call.Name != "ask_expert" {
			continue
		}
		asked = true
		if result := s.escalate(ctx, argString(call.Arguments, "question"), statusFn); result != "" {
			return result, true
		}
	}
	return "", asked
}

// execTool runs one tool call and returns its textual result plus any files it
// touched (for citations). Registry actions (timer, …) resolve first; the
// built-in file tools handle the rest.
func (s *Server) execTool(ctx context.Context, statusFn func(string), call ai.ToolCall) (string, []source) {
	if s.registry.Has(call.Name) {
		result, err := s.registry.Invoke(ctx, call.Name, call.Arguments)
		if err != nil {
			return "Error: " + err.Error(), nil
		}
		return result.Text, toSources(result.Sources)
	}
	switch call.Name {
	case "search_files":
		return s.toolSearchFiles(statusFn, argString(call.Arguments, "query"))
	case "read_file":
		return s.toolReadFile(statusFn, argString(call.Arguments, "path"))
	case "open_file":
		return toolOpenFile(argString(call.Arguments, "path"))
	}
	return "Unknown tool: " + call.Name, nil
}

// toSources adapts capability citations to the server's source type.
func toSources(items []capability.Source) []source {
	if len(items) == 0 {
		return nil
	}
	sources := make([]source, 0, len(items))
	for _, item := range items {
		sources = append(sources, source{Path: item.Path, Name: item.Name})
	}
	return sources
}

// handleCommandInvoke runs a launcher command against the shared registry and
// replies to the requesting client with the outcome. This is the launcher's
// path into the same actions the AI calls as tools.
func (s *Server) handleCommandInvoke(c *Client, msg InMessage) {
	if msg.Name == "" {
		s.sendCommandResult(c, "", "", "no action name")
		return
	}
	if !s.capabilityEnabled(s.registry.Owner(msg.Name)) {
		s.sendCommandResult(c, msg.Name, "", "action is disabled")
		return
	}
	arguments := map[string]any{}
	if len(msg.Data) > 0 {
		if err := json.Unmarshal(msg.Data, &arguments); err != nil {
			s.sendCommandResult(c, msg.Name, "", "invalid arguments")
			return
		}
	}
	result, err := s.registry.Invoke(context.Background(), msg.Name, arguments)
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

func (s *Server) toolSearchFiles(statusFn func(string), query string) (string, []source) {
	if strings.TrimSpace(query) == "" {
		return "No query provided.", nil
	}
	statusFn("Searching for " + query + "…")
	hits := capHits(fileHits(s.searchFiles(query)), 8)
	if len(hits) == 0 {
		return "No matching files.", nil
	}
	var builder strings.Builder
	var sources []source
	for _, hit := range hits {
		fmt.Fprintf(&builder, "- %s\n", hit.Path)
		sources = append(sources, source{Path: hit.Path, Name: hit.Name})
	}
	return builder.String(), sources
}

func (s *Server) toolReadFile(statusFn func(string), path string) (string, []source) {
	if strings.TrimSpace(path) == "" {
		return "No path provided.", nil
	}
	statusFn("Reading " + filepath.Base(path) + "…")
	content := readCappedFile(path, 6000)
	if content == "" {
		return "Could not read file (missing, a directory, or binary).", nil
	}
	return content, []source{{Path: path, Name: filepath.Base(path)}}
}

func toolOpenFile(path string) (string, []source) {
	if strings.TrimSpace(path) == "" {
		return "No path provided.", nil
	}
	if err := apps.Launch("xdg-open " + shellQuote(path)); err != nil {
		return "Failed to open: " + err.Error(), nil
	}
	return "Opened " + path, []source{{Path: path, Name: filepath.Base(path)}}
}

// fileHits drops directory results, leaving only readable files.
func fileHits(hits []searchd.Hit) []searchd.Hit {
	files := make([]searchd.Hit, 0, len(hits))
	for _, hit := range hits {
		if !hit.IsDir {
			files = append(files, hit)
		}
	}
	return files
}

func capHits(hits []searchd.Hit, limit int) []searchd.Hit {
	if len(hits) > limit {
		return hits[:limit]
	}
	return hits
}

func dedupeSources(sources []source) []source {
	seen := make(map[string]bool, len(sources))
	unique := make([]source, 0, len(sources))
	for _, item := range sources {
		if seen[item.Path] {
			continue
		}
		seen[item.Path] = true
		unique = append(unique, item)
	}
	return unique
}

func argString(arguments map[string]any, key string) string {
	value, ok := arguments[key]
	if !ok {
		return ""
	}
	str, ok := value.(string)
	if !ok {
		return ""
	}
	return str
}

// argSummary renders tool arguments compactly for the observation log.
func argSummary(arguments map[string]any) string {
	parts := make([]string, 0, len(arguments))
	for key, value := range arguments {
		parts = append(parts, fmt.Sprintf("%s=%v", key, value))
	}
	return strings.Join(parts, ", ")
}

// shellQuote single-quotes a string for safe use inside an `sh -c` command.
func shellQuote(value string) string {
	return "'" + strings.ReplaceAll(value, "'", `'\''`) + "'"
}
