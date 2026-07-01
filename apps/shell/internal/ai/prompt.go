package ai

import "strings"

const systemBase = "You are the assistant built into the neoshell desktop. " +
	"Answer concisely in Markdown. Use KaTeX ($...$ inline, $$...$$ display) for math. " +
	"When you draw on the provided context, cite the source file path in backticks."

// BuildMessages assembles the message list: a system prompt (with optional RAG
// context appended), the prior history, then the new user prompt.
func BuildMessages(contextText string, history []Message, prompt string) []Message {
	system := systemBase
	if strings.TrimSpace(contextText) != "" {
		system += "\n\nContext from the user's files:\n" + contextText
	}
	messages := make([]Message, 0, len(history)+2)
	messages = append(messages, Message{Role: "system", Content: system})
	messages = append(messages, history...)
	messages = append(messages, Message{Role: "user", Content: prompt})
	return messages
}
