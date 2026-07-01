package main

import (
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/neoworks/neoshell/internal/searchd"
	"github.com/neoworks/neoshell/internal/server"
)

// searchDaemonBin resolves the search daemon binary: NEOSHELL_SEARCH_BIN, else
// "neoshell-search" on PATH.
func searchDaemonBin() string {
	if path := os.Getenv("NEOSHELL_SEARCH_BIN"); path != "" {
		return path
	}
	return "neoshell-search"
}

// startSearchDaemon launches the semantic search daemon in its own process group
// so its children are contained. Non-fatal: search degrades to the filename index
// if the binary is missing.
func startSearchDaemon() {
	cmd := exec.Command(searchDaemonBin())
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = append(os.Environ(), "LD_LIBRARY_PATH="+cudaLibraryPath())
	if err := cmd.Start(); err != nil {
		log.Printf("search daemon not started (%v) — falling back to filename search", err)
		return
	}
	go func() { _ = cmd.Wait() }()
}

// cudaLibraryPath builds the LD_LIBRARY_PATH the search daemon needs so
// onnxruntime's CUDA provider can dlopen the CUDA 12 runtime libs we ship in
// <models>/cuda12, plus /usr/lib for cuDNN. Any existing LD_LIBRARY_PATH is
// preserved after ours.
func cudaLibraryPath() string {
	dirs := []string{filepath.Join(searchModelsDir(), "cuda12"), "/usr/lib"}
	if existing := os.Getenv("LD_LIBRARY_PATH"); existing != "" {
		dirs = append(dirs, existing)
	}
	return strings.Join(dirs, ":")
}

// searchModelsDir mirrors onnx.ModelsDir without importing the cgo onnx package,
// so the core stays free of the onnxruntime dependency.
func searchModelsDir() string {
	if dir := os.Getenv("NEOSHELL_MODELS_DIR"); dir != "" {
		return dir
	}
	base := os.Getenv("XDG_DATA_HOME")
	if base == "" {
		base = filepath.Join(os.Getenv("HOME"), ".local", "share")
	}
	return filepath.Join(base, "neoshell", "models")
}

// pollSearchProgress polls the daemon's index progress and rebroadcasts it on the
// "search:progress" topic whenever it changes, so the UI can show (and clear) a
// persistent "indexing…" notification. Silent while the daemon is unreachable.
func pollSearchProgress(hub *server.Hub) {
	var last searchd.ProgressInfo
	var sentAny bool
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()

	for range ticker.C {
		response, err := searchd.QuerySocket(searchd.SocketPath(), searchd.Request{Op: "progress"})
		if err != nil || response.Progress == nil {
			continue
		}
		info := *response.Progress
		if sentAny && info == last {
			continue
		}
		last, sentAny = info, true
		hub.Broadcast("search:progress", info)
	}
}
