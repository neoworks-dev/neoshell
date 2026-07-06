package voice

import "strings"

// feeder splits a streamed token sequence into whole sentences and speaks each
// as soon as it completes, so audio starts before the full answer is generated.
type feeder struct {
	tts *ttsClient
	gen string
	buf strings.Builder
}

func newFeeder(tts *ttsClient, gen string) *feeder {
	return &feeder{tts: tts, gen: gen}
}

func (f *feeder) push(token string) {
	if f.tts == nil {
		return
	}
	f.buf.WriteString(token)
	for {
		text := f.buf.String()
		cut := sentenceBreak(text)
		if cut < 0 {
			break
		}
		sentence := strings.TrimSpace(text[:cut])
		rest := text[cut:]
		f.buf.Reset()
		f.buf.WriteString(rest)
		if sentence != "" {
			_ = f.tts.Speak(f.gen, sentence)
		}
	}
}

// flush speaks any trailing text left after the last sentence break.
func (f *feeder) flush() {
	if f.tts == nil {
		return
	}
	sentence := strings.TrimSpace(f.buf.String())
	f.buf.Reset()
	if sentence != "" {
		_ = f.tts.Speak(f.gen, sentence)
	}
}

// sentenceBreak returns the byte index just past the first sentence-ending
// punctuation followed by whitespace (or a newline), or -1 if none. Requiring a
// trailing space avoids cutting mid-token (e.g. on "3.14" or "e.g.").
func sentenceBreak(s string) int {
	runes := []rune(s)
	for i, r := range runes {
		if r == '\n' {
			return len(string(runes[:i+1]))
		}
		if r == '.' || r == '!' || r == '?' || r == '…' {
			if i+1 < len(runes) && isSpace(runes[i+1]) {
				return len(string(runes[:i+1]))
			}
		}
	}
	return -1
}

func isSpace(r rune) bool {
	return r == ' ' || r == '\t' || r == '\n' || r == '\r'
}
