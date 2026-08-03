package files

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"

	"github.com/neoworks/neoshell/internal/capability"
)

// maxHits and maxBytes bound what one action can put into the model's context.
const (
	maxHits  = 8
	maxBytes = 6000
)

func (s *Service) Capability() capability.Capability {
	return fileCapability{service: s}
}

type fileCapability struct {
	service *Service
}

func (c fileCapability) ID() string { return "files" }

func (c fileCapability) Actions() []capability.Action {
	return []capability.Action{
		{
			Name:        "files:search",
			Description: "Search the user's indexed files by keyword or natural language. Covers the whole home directory, not just a project.",
			Params: map[string]capability.ParamSpec{
				"query": {Type: "string", Description: "What to search for.", Required: true},
			},
			Policy:  capability.PolicyAllow,
			Handler: c.search,
		},
		{
			Name:        "files:read",
			Description: "Read the text contents of a file by absolute path. Long files are truncated.",
			Params: map[string]capability.ParamSpec{
				"path": {Type: "string", Description: "Absolute path of the file to read.", Required: true},
			},
			Policy:  capability.PolicyAllow,
			Handler: c.read,
		},
	}
}

func (c fileCapability) search(_ context.Context, arguments map[string]any) (capability.Result, error) {
	query := stringArg(arguments, "query")
	if query == "" {
		return capability.Result{}, fmt.Errorf("query is required")
	}
	if c.service.search == nil {
		return capability.Result{Text: "File search is unavailable."}, nil
	}

	var builder strings.Builder
	var sources []capability.Source
	for _, hit := range c.service.search(query) {
		if hit.IsDir {
			continue
		}
		fmt.Fprintf(&builder, "- %s\n", hit.Path)
		sources = append(sources, capability.Source{Path: hit.Path, Name: hit.Name})
		if len(sources) >= maxHits {
			break
		}
	}
	if len(sources) == 0 {
		return capability.Result{Text: "No matching files."}, nil
	}
	return capability.Result{Text: strings.TrimRight(builder.String(), "\n"), Sources: sources}, nil
}

func (c fileCapability) read(_ context.Context, arguments map[string]any) (capability.Result, error) {
	path := stringArg(arguments, "path")
	if path == "" {
		return capability.Result{}, fmt.Errorf("path is required")
	}
	content := readCapped(path, maxBytes)
	if content == "" {
		return capability.Result{}, fmt.Errorf("could not read %s (missing, a directory, or binary)", path)
	}
	return capability.Result{
		Text:    content,
		Sources: []capability.Source{{Path: path, Name: filepath.Base(path)}},
	}, nil
}

func stringArg(arguments map[string]any, key string) string {
	value, ok := arguments[key].(string)
	if !ok {
		return ""
	}
	return strings.TrimSpace(value)
}
