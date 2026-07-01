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
