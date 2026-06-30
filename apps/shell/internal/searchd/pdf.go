package searchd

import (
	"bytes"
	"io"

	"github.com/ledongthuc/pdf"
)

// readPDFText extracts the plain text of a PDF (pure-Go, no poppler), capped to
// maxTextBytes so a huge document doesn't blow up the index.
func readPDFText(path string) (string, error) {
	file, reader, err := pdf.Open(path)
	if err != nil {
		return "", err
	}
	defer file.Close()

	plain, err := reader.GetPlainText()
	if err != nil {
		return "", err
	}
	var buffer bytes.Buffer
	if _, err := io.CopyN(&buffer, plain, maxTextBytes); err != nil && err != io.EOF {
		return "", err
	}
	return buffer.String(), nil
}
