package server

import (
	"testing"

	"github.com/neoworks/neoshell/internal/searchd"
)

func TestShellQuote(t *testing.T) {
	cases := map[string]string{
		"/home/a/file.txt":    "'/home/a/file.txt'",
		"/home/a/my file.txt": "'/home/a/my file.txt'",
		"/tmp/it's here.txt":  `'/tmp/it'\''s here.txt'`,
	}
	for input, want := range cases {
		if got := shellQuote(input); got != want {
			t.Errorf("shellQuote(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestDedupeSources(t *testing.T) {
	in := []source{
		{Path: "/a", Name: "a"},
		{Path: "/b", Name: "b"},
		{Path: "/a", Name: "a"},
	}
	got := dedupeSources(in)
	if len(got) != 2 {
		t.Fatalf("len = %d, want 2", len(got))
	}
	if got[0].Path != "/a" || got[1].Path != "/b" {
		t.Fatalf("order not preserved: %v", got)
	}
}

func TestFileHitsAndCap(t *testing.T) {
	hits := []searchd.Hit{
		{Path: "/dir", IsDir: true},
		{Path: "/a", Name: "a"},
		{Path: "/b", Name: "b"},
		{Path: "/c", Name: "c"},
	}
	files := fileHits(hits)
	if len(files) != 3 {
		t.Fatalf("fileHits len = %d, want 3", len(files))
	}
	capped := capHits(files, 2)
	if len(capped) != 2 {
		t.Fatalf("capHits len = %d, want 2", len(capped))
	}
	if capHits(files, 10)[0].Path != "/a" {
		t.Fatalf("capHits over-limit changed slice")
	}
}
