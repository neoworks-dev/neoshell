package ai

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
)

func ollamaBase() string {
	if base := os.Getenv("OLLAMA_HOST"); base != "" {
		return base
	}
	return "http://localhost:11434"
}

func ollamaURL() string { return ollamaBase() + "/api/chat" }

// availableModels lists the models ollama currently has pulled.
func availableModels(ctx context.Context) []string {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, ollamaBase()+"/api/tags", nil)
	if err != nil {
		return nil
	}
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return nil
	}
	defer response.Body.Close()
	var payload struct {
		Models []struct {
			Name string `json:"name"`
		} `json:"models"`
	}
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return nil
	}
	names := make([]string, 0, len(payload.Models))
	for _, model := range payload.Models {
		names = append(names, model.Name)
	}
	return names
}

// resolveModel returns `want` if it is installed; otherwise the first available
// non-embedding model, so chat still works when the configured model is missing.
func resolveModel(ctx context.Context, want string) string {
	models := availableModels(ctx)
	if len(models) == 0 {
		return want
	}
	for _, model := range models {
		if model == want {
			return want
		}
	}
	for _, model := range models {
		if !strings.Contains(model, "embed") {
			return model
		}
	}
	return models[0]
}

// streamOllama streams from ollama's /api/chat, which emits one JSON object per
// line (NDJSON), each carrying an incremental message.content and a done flag.
func streamOllama(ctx context.Context, cfg Config, messages []Message, onToken func(string)) error {
	body, err := json.Marshal(map[string]any{
		"model":    resolveModel(ctx, cfg.Model),
		"messages": messages,
		"stream":   true,
	})
	if err != nil {
		return err
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, ollamaURL(), bytes.NewReader(body))
	if err != nil {
		return err
	}
	request.Header.Set("Content-Type", "application/json")

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("ollama: status %d", response.StatusCode)
	}

	scanner := bufio.NewScanner(response.Body)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	for scanner.Scan() {
		line := bytes.TrimSpace(scanner.Bytes())
		if len(line) == 0 {
			continue
		}
		var chunk struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
			Done bool `json:"done"`
		}
		if err := json.Unmarshal(line, &chunk); err != nil {
			continue
		}
		if chunk.Message.Content != "" {
			onToken(chunk.Message.Content)
		}
		if chunk.Done {
			break
		}
	}
	return scanner.Err()
}

// completeOllama runs one non-streaming /api/chat turn, passing any tools so the
// model can request tool calls. ollama returns tool-call arguments as a JSON
// object.
func completeOllama(ctx context.Context, cfg Config, messages []Message, tools []ToolSpec) (Completion, error) {
	payload := map[string]any{
		"model":    resolveModel(ctx, cfg.Model),
		"messages": messages,
		"stream":   false,
	}
	if len(tools) > 0 {
		payload["tools"] = tools
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return Completion{}, err
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, ollamaURL(), bytes.NewReader(body))
	if err != nil {
		return Completion{}, err
	}
	request.Header.Set("Content-Type", "application/json")

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return Completion{}, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return Completion{}, fmt.Errorf("ollama: status %d", response.StatusCode)
	}

	var out struct {
		Message struct {
			Content   string `json:"content"`
			ToolCalls []struct {
				Function struct {
					Name      string         `json:"name"`
					Arguments map[string]any `json:"arguments"`
				} `json:"function"`
			} `json:"tool_calls"`
		} `json:"message"`
	}
	if err := json.NewDecoder(response.Body).Decode(&out); err != nil {
		return Completion{}, err
	}

	completion := Completion{Content: out.Message.Content}
	for _, call := range out.Message.ToolCalls {
		completion.ToolCalls = append(completion.ToolCalls, ToolCall{
			Name:      call.Function.Name,
			Arguments: call.Function.Arguments,
		})
	}
	return completion, nil
}
