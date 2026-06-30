// Command neoshell-search is the semantic file-search daemon. With no arguments
// (or "daemon") it watches the home directory, indexes file contents into the
// store, and answers hybrid queries over a unix socket. With "query <text>" it
// asks a running daemon and prints the hits.
package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"github.com/neoworks/neoshell/internal/searchd"
	"github.com/neoworks/neoshell/internal/searchd/onnx"
)

func main() {
	args := os.Args[1:]
	if len(args) > 0 && args[0] == "query" {
		runQuery(args[1:])
		return
	}
	if len(args) > 0 && args[0] == "progress" {
		runProgress()
		return
	}
	runDaemon()
}

func runDaemon() {
	// Single instance: if a daemon already answers on the socket, don't start a
	// second (it would fight over the socket and the surreal port).
	if _, err := searchd.QuerySocket(searchd.SocketPath(), searchd.Request{Op: "ping"}); err == nil {
		fmt.Fprintln(os.Stderr, "search daemon already running — exiting")
		return
	}

	ctx, cancel := signalContext()
	defer cancel()

	store, err := searchd.OpenStore(ctx)
	if err != nil {
		fmt.Fprintf(os.Stderr, "open store: %v\n", err)
		os.Exit(1)
	}
	defer store.Close()

	// In-process ONNX embedder. A nil interface (model files absent) makes the
	// daemon index filenames/BM25 only — handled by the indexer and search paths.
	var embedder searchd.Embedder
	if onnxEmbedder, err := onnx.New(onnx.ModelsDir()); err == nil {
		embedder = onnxEmbedder
	} else {
		fmt.Fprintf(os.Stderr, "embeddings unavailable (%v) — indexing filenames/BM25 only\n", err)
	}

	daemon := searchd.NewDaemon(store, embedder, searchd.DefaultRoots())
	if err := daemon.Run(ctx, searchd.SocketPath()); err != nil {
		fmt.Fprintf(os.Stderr, "search daemon: %v\n", err)
		os.Exit(1)
	}
}

func runQuery(args []string) {
	if len(args) == 0 {
		fmt.Fprintln(os.Stderr, "usage: neoshell-search query <text>")
		os.Exit(2)
	}
	request := searchd.Request{Op: "query", Text: strings.Join(args, " "), Limit: 30}
	response, err := searchd.QuerySocket(searchd.SocketPath(), request)
	if err != nil {
		fmt.Fprintf(os.Stderr, "query: %v\n", err)
		os.Exit(1)
	}
	if response.Error != "" {
		fmt.Fprintf(os.Stderr, "daemon error: %s\n", response.Error)
		os.Exit(1)
	}
	for _, hit := range response.Hits {
		fmt.Printf("%.4f  %-8s  %s\n", hit.Score, hit.Modality, hit.Path)
		if hit.Snippet != "" {
			fmt.Printf("          %s\n", hit.Snippet)
		}
	}
}

func runProgress() {
	response, err := searchd.QuerySocket(searchd.SocketPath(), searchd.Request{Op: "progress"})
	if err != nil {
		fmt.Fprintf(os.Stderr, "progress: %v\n", err)
		os.Exit(1)
	}
	if response.Progress == nil {
		fmt.Println("no progress reported")
		return
	}
	p := response.Progress
	fmt.Printf("phase=%s done=%d total=%d active=%t\n", p.Phase, p.Done, p.Total, p.Active)
}

func signalContext() (context.Context, context.CancelFunc) {
	ctx, cancel := context.WithCancel(context.Background())
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigCh
		cancel()
	}()
	return ctx, cancel
}
