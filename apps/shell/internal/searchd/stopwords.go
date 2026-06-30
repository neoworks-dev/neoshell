package searchd

import (
	"strings"
	"unicode"
)

// stopwords is a compact English stop list. SurrealDB's analyzer has no built-in
// stopword filter, so we strip these from query terms before BM25 (the index
// side relies on idf). Kept small and high-frequency on purpose.
var stopwords = map[string]bool{
	"a": true, "an": true, "and": true, "are": true, "as": true, "at": true,
	"be": true, "but": true, "by": true, "for": true, "from": true, "has": true,
	"have": true, "he": true, "her": true, "his": true, "i": true, "in": true,
	"is": true, "it": true, "its": true, "of": true, "on": true, "or": true,
	"she": true, "that": true, "the": true, "their": true, "them": true,
	"then": true, "there": true, "these": true, "they": true, "this": true,
	"to": true, "was": true, "were": true, "what": true, "when": true,
	"where": true, "which": true, "who": true, "will": true, "with": true,
	"you": true, "your": true,
}

// queryTerms lowercases, splits on non-alphanumerics, and drops stopwords and
// 1-char tokens. Returns the terms used to drive BM25.
func queryTerms(query string) []string {
	fields := strings.FieldsFunc(strings.ToLower(query), func(r rune) bool {
		return !unicode.IsLetter(r) && !unicode.IsDigit(r)
	})
	terms := make([]string, 0, len(fields))
	for _, field := range fields {
		if len(field) < 2 || stopwords[field] {
			continue
		}
		terms = append(terms, field)
	}
	return terms
}
