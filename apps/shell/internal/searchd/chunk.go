package searchd

import "strings"

// Chunking is rune-based on character budgets rather than true tokens. Nomic's
// context is ~2k tokens; ~1600 chars with overlap stays well under that while
// keeping chunks semantically whole.
const (
	defaultChunkSize    = 1600
	defaultChunkOverlap = 200
)

// chunkText splits text into overlapping windows. It prefers to break on a
// paragraph or newline boundary near the window end so chunks don't cut a line
// mid-word. Returns nil for empty input.
func chunkText(text string, size, overlap int) []string {
	runes := []rune(strings.TrimSpace(text))
	if len(runes) == 0 {
		return nil
	}
	if size <= 0 {
		size = defaultChunkSize
	}
	if overlap < 0 || overlap >= size {
		overlap = defaultChunkOverlap
	}

	var chunks []string
	start := 0
	for start < len(runes) {
		end := start + size
		if end >= len(runes) {
			chunks = append(chunks, strings.TrimSpace(string(runes[start:])))
			break
		}
		end = breakPoint(runes, start, end)
		chunk := strings.TrimSpace(string(runes[start:end]))
		if chunk != "" {
			chunks = append(chunks, chunk)
		}
		start = end - overlap
		if start < 0 {
			start = 0
		}
	}
	return chunks
}

// breakPoint nudges end back to the nearest newline within the last 20% of the
// window, so a chunk ends at a line boundary when one is close.
func breakPoint(runes []rune, start, end int) int {
	window := end - start
	earliest := end - window/5
	for i := end; i > earliest && i > start; i-- {
		if runes[i-1] == '\n' {
			return i
		}
	}
	return end
}
