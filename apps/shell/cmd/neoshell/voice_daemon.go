package main

import (
	"log"
	"os"
	"os/exec"
	"sync"
	"syscall"
	"time"

	"github.com/neoworks/neoshell/internal/config"
)

// Voice mode is a process, not a flag.
//
// The assistant is always resident; what toggles is the pipeline that holds the
// microphone and two Python model processes. Starting and stopping that process
// is the honest implementation of "voice mode off" — a muted-but-running
// pipeline would still hold the mic and still cost the GPU.

// voiceStopGrace is how long the daemon gets to shut its sidecars down before
// the process group is killed. The Python children hold audio devices, so a
// clean exit matters more here than speed.
const voiceStopGrace = 3 * time.Second

type voiceDaemon struct {
	mu  sync.Mutex
	cmd *exec.Cmd
}

// voiceDaemonBin resolves the daemon binary: NEOSHELL_VOICE_BIN, else
// "neoshell-voice" on PATH.
func voiceDaemonBin() string {
	if path := os.Getenv("NEOSHELL_VOICE_BIN"); path != "" {
		return path
	}
	return "neoshell-voice"
}

// start launches the daemon if it is not already running. Non-fatal: without
// it the shell simply has no voice.
func (v *voiceDaemon) start() {
	v.mu.Lock()
	defer v.mu.Unlock()
	if v.cmd != nil {
		return
	}

	cmd := exec.Command(voiceDaemonBin())
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Start(); err != nil {
		log.Printf("voice daemon not started (%v)", err)
		return
	}
	v.cmd = cmd
	log.Printf("voice: listening")

	go func() {
		_ = cmd.Wait()
		v.mu.Lock()
		if v.cmd == cmd {
			v.cmd = nil
		}
		v.mu.Unlock()
	}()
}

// stop terminates the daemon and its sidecars.
func (v *voiceDaemon) stop() {
	v.mu.Lock()
	cmd := v.cmd
	v.cmd = nil
	v.mu.Unlock()
	if cmd == nil || cmd.Process == nil {
		return
	}

	pgid, err := syscall.Getpgid(cmd.Process.Pid)
	if err != nil {
		_ = cmd.Process.Signal(syscall.SIGTERM)
		return
	}
	_ = syscall.Kill(-pgid, syscall.SIGTERM)

	deadline := time.Now().Add(voiceStopGrace)
	for time.Now().Before(deadline) {
		if err := syscall.Kill(-pgid, 0); err != nil {
			log.Printf("voice: stopped")
			return
		}
		time.Sleep(100 * time.Millisecond)
	}
	_ = syscall.Kill(-pgid, syscall.SIGKILL)
}

// apply brings the daemon in line with the configured state.
func (v *voiceDaemon) apply(enabled bool) {
	if enabled {
		v.start()
		return
	}
	v.stop()
}

// voiceEnabled reads the persisted toggle.
func voiceEnabled(cfg *config.Store) bool {
	value, ok := cfg.Get("voice.enabled")
	if !ok {
		return false
	}
	enabled, _ := value.(bool)
	return enabled
}
