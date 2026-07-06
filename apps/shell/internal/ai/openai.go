package ai

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

// streamOpenAI streams from an OpenAI-compatible /chat/completions endpoint. The
// response is Server-Sent Events: "data: {json}" lines with a choices[].delta,
// terminated by "data: [DONE]".
func streamOpenAI(ctx context.Context, cfg Config, messages []Message, onToken func(string)) error {
	if cfg.Endpoint == "" {
		return fmt.Errorf("ai: external endpoint not configured")
	}
	body, err := json.Marshal(map[string]any{
		"model":    cfg.Model,
		"messages": messages,
		"stream":   true,
	})
	if err != nil {
		return err
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, cfg.Endpoint, bytes.NewReader(body))
	if err != nil {
		return err
	}
	request.Header.Set("Content-Type", "application/json")
	if cfg.APIKey != "" {
		request.Header.Set("Authorization", "Bearer "+cfg.APIKey)
	}

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("ai: endpoint status %d", response.StatusCode)
	}

	scanner := bufio.NewScanner(response.Body)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		payload := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if payload == "[DONE]" {
			break
		}
		var chunk struct {
			Choices []struct {
				Delta struct {
					Content string `json:"content"`
				} `json:"delta"`
			} `json:"choices"`
		}
		if err := json.Unmarshal([]byte(payload), &chunk); err != nil {
			continue
		}
		if len(chunk.Choices) > 0 && chunk.Choices[0].Delta.Content != "" {
			onToken(chunk.Choices[0].Delta.Content)
		}
	}
	return scanner.Err()
}

// completeOpenAI runs one non-streaming /chat/completions turn with tools. The
// OpenAI schema returns tool-call arguments as a JSON-encoded string.
func completeOpenAI(ctx context.Context, cfg Config, messages []Message, tools []ToolSpec) (Completion, error) {
	if cfg.Endpoint == "" {
		return Completion{}, fmt.Errorf("ai: external endpoint not configured")
	}
	payload := map[string]any{
		"model":    cfg.Model,
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
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, cfg.Endpoint, bytes.NewReader(body))
	if err != nil {
		return Completion{}, err
	}
	request.Header.Set("Content-Type", "application/json")
	if cfg.APIKey != "" {
		request.Header.Set("Authorization", "Bearer "+cfg.APIKey)
	}

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return Completion{}, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return Completion{}, fmt.Errorf("ai: endpoint status %d", response.StatusCode)
	}

	var out struct {
		Choices []struct {
			Message struct {
				Content   string `json:"content"`
				ToolCalls []struct {
					Function struct {
						Name      string `json:"name"`
						Arguments string `json:"arguments"`
					} `json:"function"`
				} `json:"tool_calls"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(response.Body).Decode(&out); err != nil {
		return Completion{}, err
	}
	if len(out.Choices) == 0 {
		return Completion{}, nil
	}

	message := out.Choices[0].Message
	completion := Completion{Content: message.Content}
	for _, call := range message.ToolCalls {
		arguments := map[string]any{}
		if call.Function.Arguments != "" {
			json.Unmarshal([]byte(call.Function.Arguments), &arguments)
		}
		completion.ToolCalls = append(completion.ToolCalls, ToolCall{
			Name:      call.Function.Name,
			Arguments: arguments,
		})
	}
	return completion, nil
}
