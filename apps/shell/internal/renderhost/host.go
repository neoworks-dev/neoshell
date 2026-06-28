package renderhost

import (
	"fmt"
	"os"
	"os/exec"
	"syscall"
)

// Host is a spawned render-host process.
type Host struct {
	cmd *exec.Cmd
}

// DefaultBinPath returns the render-host binary path from NEOSHELL_RENDER_BIN, or a
// sensible default relative to the working directory.
func DefaultBinPath() string {
	if path := os.Getenv("NEOSHELL_RENDER_BIN"); path != "" {
		return path
	}
	return "apps/render-host/neoshell-render"
}

// SpawnHost launches the C++/WPE render-host. WPE uses system libraries, so no
// special library path is needed (unlike the old CEF host).
func SpawnHost(binPath string) (*Host, error) {
	if _, err := os.Stat(binPath); err != nil {
		return nil, fmt.Errorf("render host binary %q: %w", binPath, err)
	}

	cmd := exec.Command(binPath)
	// Put the render host (and WebKit's web/network subprocesses, which it forks)
	// in its own process group so Stop can signal the whole group and no
	// subprocess orphans keeping a layer surface mapped.
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	cmd.Env = os.Environ()
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("start render host: %w", err)
	}
	return &Host{cmd: cmd}, nil
}

// Stop terminates the render host and every subprocess by signalling the whole
// process group (negative pid). Falls back to killing the lone process if the
// group could not be resolved.
func (h *Host) Stop() {
	if h.cmd.Process == nil {
		return
	}
	pid := h.cmd.Process.Pid
	if pgid, err := syscall.Getpgid(pid); err == nil {
		_ = syscall.Kill(-pgid, syscall.SIGKILL)
	} else {
		_ = h.cmd.Process.Kill()
	}
	_ = h.cmd.Wait()
}
