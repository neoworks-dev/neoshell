package searchd

import (
	"os"
	"path/filepath"
	"strings"
	"unicode/utf8"
)

// maxTextBytes caps how much of a file we read and embed. Large text files are
// rare and expensive to embed; the cap keeps the index sane.
const maxTextBytes = 1 << 20 // 1 MiB

// Kind classifies a file for the indexing pipeline.
type Kind int

const (
	KindSkip  Kind = iota // not indexed by content; filename-only
	KindText              // readable text/code/markdown
	KindPDF               // PDF document
	KindImage             // raster image
)

// textExtensions are content-indexed as plain text. Broad but excludes binaries.
var textExtensions = map[string]bool{
	".txt": true, ".md": true, ".markdown": true, ".rst": true, ".org": true,
	".go": true, ".rs": true, ".c": true, ".h": true, ".cpp": true, ".hpp": true,
	".cc": true, ".py": true, ".js": true, ".ts": true, ".jsx": true, ".tsx": true,
	".svelte": true, ".vue": true, ".java": true, ".kt": true, ".rb": true,
	".php": true, ".sh": true, ".bash": true, ".zsh": true, ".fish": true,
	".lua": true, ".sql": true, ".html": true, ".css": true, ".scss": true,
	".json": true, ".yaml": true, ".yml": true, ".toml": true, ".ini": true,
	".conf": true, ".cfg": true, ".xml": true, ".csv": true, ".tex": true,
	".cs": true, ".swift": true, ".scala": true, ".clj": true, ".ex": true,
	".exs": true, ".erl": true, ".hs": true, ".ml": true, ".vim": true,
	".dockerfile": true, ".makefile": true, ".gradle": true, ".env": true,
}

var imageExtensions = map[string]bool{
	".png": true, ".jpg": true, ".jpeg": true, ".webp": true, ".gif": true,
	".bmp": true, ".tiff": true,
}

// proseExtensions are natural-language documents. Only these (and PDFs) get
// vector embeddings — nomic-embed-text is weak on source code, where BM25's exact
// term matching is the better tool. Code is still indexed as text for BM25.
var proseExtensions = map[string]bool{
	".md": true, ".markdown": true, ".txt": true, ".rst": true, ".org": true,
	".tex": true, ".adoc": true,
}

// isProse reports whether a text/PDF file is natural language worth embedding.
func isProse(path string, kind Kind) bool {
	if kind == KindPDF {
		return true
	}
	switch strings.ToLower(filepath.Base(path)) {
	case "readme", "license", "changelog", "notes":
		return true
	}
	return proseExtensions[strings.ToLower(filepath.Ext(path))]
}

// classify decides how a file is indexed, from its extension (and base name for
// extension-less files like Makefile/Dockerfile).
func classify(path string) Kind {
	ext := strings.ToLower(filepath.Ext(path))
	switch {
	case imageExtensions[ext]:
		return KindImage
	case ext == ".pdf":
		return KindPDF
	case textExtensions[ext]:
		return KindText
	}
	switch strings.ToLower(filepath.Base(path)) {
	case "makefile", "dockerfile", "readme", "license", "cargo.lock":
		return KindText
	}
	return KindSkip
}

// extractText returns a file's text for indexing: the raw bytes for a text file
// (capped, validated UTF-8) or the extracted text for a PDF. Returns "" when
// there is nothing indexable.
func extractText(path string, kind Kind) (string, error) {
	switch kind {
	case KindText:
		return readCappedText(path)
	case KindPDF:
		return readPDFText(path)
	default:
		return "", nil
	}
}

func readCappedText(path string) (string, error) {
	file, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer file.Close()

	buffer := make([]byte, maxTextBytes)
	n, err := file.Read(buffer)
	if err != nil && n == 0 {
		return "", err
	}
	content := buffer[:n]
	if !utf8.Valid(content) {
		return "", nil // binary masquerading as a text extension; skip content
	}
	return string(content), nil
}
