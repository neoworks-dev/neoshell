package ai

import (
	"strings"
	"testing"
)

func TestBuildMessagesInjectsContextAndOrder(t *testing.T) {
	history := []Message{
		{Role: "user", Content: "hi"},
		{Role: "assistant", Content: "hello"},
	}
	messages := BuildMessages("- /notes/a.md\n  a snippet\n", history, "what is x?")

	if len(messages) != 4 {
		t.Fatalf("expected 4 messages, got %d", len(messages))
	}
	if messages[0].Role != "system" {
		t.Fatalf("first message must be system, got %q", messages[0].Role)
	}
	if !strings.Contains(messages[0].Content, "/notes/a.md") {
		t.Fatalf("RAG context not injected into system prompt")
	}
	last := messages[len(messages)-1]
	if last.Role != "user" || last.Content != "what is x?" {
		t.Fatalf("prompt must be the final user message, got %+v", last)
	}
}

func TestBuildMessagesWithoutContext(t *testing.T) {
	messages := BuildMessages("   ", nil, "hi")
	if len(messages) != 2 {
		t.Fatalf("expected system + user, got %d", len(messages))
	}
	if strings.Contains(messages[0].Content, "Context from the user's files") {
		t.Fatalf("empty context should not add a context section")
	}
}
