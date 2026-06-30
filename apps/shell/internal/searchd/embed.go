package searchd

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
)

// Nomic's embedding models expect task prefixes; documents and queries must use
// matching prefixes to land in the same space.
const (
	docPrefix   = "search_document: "
	queryPrefix = "search_query: "

	textModel = "nomic-embed-text"
	// Ollama has no image-embedding model, so images are captioned by a small
	// vision model and the caption is embedded with the text model — keeping
	// images in the SAME vector space as documents (true cross-modal search).
	captionModel  = "moondream"
	captionPrompt = "Describe this image for search in one or two sentences. Include any visible text, key objects, and overall context. Be concise and factual."
)

// Embedder turns text and images into vectors in the shared 768-d space.
type Embedder interface {
	EmbedDocuments(ctx context.Context, texts []string) ([][]float32, error)
	EmbedQuery(ctx context.Context, query string) ([]float32, error)
	// DescribeImage returns a text caption of an image (via a vision model) that
	// can then be embedded with EmbedDocuments, so images land in the text space.
	DescribeImage(ctx context.Context, path string) (string, error)
	// Available reports whether the backend is reachable, so the daemon can
	// degrade to filename-only indexing when it is not.
	Available(ctx context.Context) bool
}

// OllamaEmbedder talks to a local Ollama server over HTTP.
type OllamaEmbedder struct {
	baseURL string
	client  *http.Client
}

// NewOllamaEmbedder builds an embedder pointed at OLLAMA_HOST or localhost:11434.
func NewOllamaEmbedder() *OllamaEmbedder {
	base := os.Getenv("OLLAMA_HOST")
	if base == "" {
		base = "http://127.0.0.1:11434"
	}
	return &OllamaEmbedder{
		baseURL: base,
		// Generous: a cold vision-model load for the first image caption can take
		// well over a minute; text embeddings are fast regardless.
		client: &http.Client{Timeout: 180 * time.Second},
	}
}

type embedRequest struct {
	Model  string   `json:"model"`
	Input  []string `json:"input,omitempty"`
	Images []string `json:"images,omitempty"`
}

type embedResponse struct {
	Embeddings [][]float32 `json:"embeddings"`
	Error      string      `json:"error,omitempty"`
}

func (e *OllamaEmbedder) embed(ctx context.Context, body embedRequest) ([][]float32, error) {
	raw, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, e.baseURL+"/api/embed", bytes.NewReader(raw))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := e.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var decoded embedResponse
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return nil, err
	}
	if decoded.Error != "" {
		return nil, fmt.Errorf("ollama: %s", decoded.Error)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ollama embed status %d", resp.StatusCode)
	}
	return decoded.Embeddings, nil
}

func (e *OllamaEmbedder) EmbedDocuments(ctx context.Context, texts []string) ([][]float32, error) {
	if len(texts) == 0 {
		return nil, nil
	}
	prefixed := make([]string, len(texts))
	for i, text := range texts {
		prefixed[i] = docPrefix + text
	}
	return e.embed(ctx, embedRequest{Model: textModel, Input: prefixed})
}

func (e *OllamaEmbedder) EmbedQuery(ctx context.Context, query string) ([]float32, error) {
	embeddings, err := e.embed(ctx, embedRequest{Model: textModel, Input: []string{queryPrefix + query}})
	if err != nil {
		return nil, err
	}
	if len(embeddings) == 0 {
		return nil, fmt.Errorf("ollama returned no query embedding")
	}
	return embeddings[0], nil
}

type generateRequest struct {
	Model  string   `json:"model"`
	Prompt string   `json:"prompt"`
	Images []string `json:"images"`
	Stream bool     `json:"stream"`
}

type generateResponse struct {
	Response string `json:"response"`
	Error    string `json:"error,omitempty"`
}

func (e *OllamaEmbedder) DescribeImage(ctx context.Context, path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	body := generateRequest{
		Model:  captionModel,
		Prompt: captionPrompt,
		Images: []string{base64.StdEncoding.EncodeToString(data)},
		Stream: false,
	}
	raw, err := json.Marshal(body)
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, e.baseURL+"/api/generate", bytes.NewReader(raw))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := e.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var decoded generateResponse
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return "", err
	}
	if decoded.Error != "" {
		return "", fmt.Errorf("ollama: %s", decoded.Error)
	}
	return strings.TrimSpace(decoded.Response), nil
}

func (e *OllamaEmbedder) Available(ctx context.Context) bool {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, e.baseURL+"/api/tags", nil)
	if err != nil {
		return false
	}
	resp, err := e.client.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}
