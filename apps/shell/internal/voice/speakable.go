package voice

import (
	"regexp"
	"strings"
	"unicode"
)

// Text sanitisation for speech.
//
// The agent writes for a reader, and its cloud models emit markdown freely.
// The TTS sidecars do not merely read that badly — MOSS refuses outright on a
// character it does not know ("Found 1 unsupported character(s): ['„']"), so a
// single typographic quote in an answer silences the whole reply. Everything
// here exists to make that impossible.
//
// Ported from the Python voice client, which is where these rules were learned.

var (
	codeFence = regexp.MustCompile("(?s)```.*?```")
	markup    = regexp.MustCompile("(?m)[`*_#>|]|^\\s*[-•]\\s+")

	// English writes the symbol first ("$3"), German last ("3€"). Spoken, the
	// amount always leads.
	leadingCurrency = regexp.MustCompile(`([€$£])\s?(\d[\d.,]*)`)

	// Dropping a quote or a dash strips the character but leaves its spacing.
	orphanSpace = regexp.MustCompile(`\s+([.,!?;:])`)

	collapseSpace = regexp.MustCompile(`\s+`)
)

var currencyNames = map[string]string{"€": "Euro", "$": "Dollar", "£": "Pound"}

// punctuation folds typographic characters the models emit and the engines
// reject. Quotes carry no sound, so they are dropped rather than transliterated;
// dashes become the comma-length pause they stand for.
var punctuation = strings.NewReplacer(
	"„", "", "“", "", "”", "", "‟", "",
	"‘", "'", "’", "'", "‚", "", "‛", "'",
	"«", "", "»", "", "‹", "", "›", "",
	"′", "'", "″", "", "‵", "'",
	"–", ", ", "—", ", ", "‒", ", ", "―", ", ",
	"‑", "-", "‐", "-",
	"…", ".",
	" ", " ", " ", " ", " ", " ", " ", " ",
	"€", " Euro", "$", " Dollar", "£", " Pound",
)

// speakableRune reports whether a rune survives the final pass. Unicode letters
// are kept, so umlauts and ß — which the backends do support — are untouched;
// emoji, arrows, ™, and box drawing are not.
func speakableRune(r rune) bool {
	if unicode.IsLetter(r) || unicode.IsDigit(r) || unicode.IsSpace(r) {
		return true
	}
	return strings.ContainsRune(".,!?;:'()-/%&+=@", r)
}

// Speakable strips what a TTS engine would read out as noise, or refuse.
func Speakable(text string) string {
	text = codeFence.ReplaceAllString(text, " code block omitted, ")
	text = markup.ReplaceAllString(text, "")
	text = leadingCurrency.ReplaceAllStringFunc(text, func(match string) string {
		parts := leadingCurrency.FindStringSubmatch(match)
		return parts[2] + " " + currencyNames[parts[1]]
	})
	text = punctuation.Replace(text)
	text = strings.Map(func(r rune) rune {
		if speakableRune(r) {
			return r
		}
		return -1
	}, text)
	text = orphanSpace.ReplaceAllString(text, "$1")
	return strings.TrimSpace(collapseSpace.ReplaceAllString(text, " "))
}
