package renderhost

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
)

// Host is a spawned render-host process.
type Host struct {
	cmd *exec.Cmd
}

// DefaultBinPath returns the render-host binary path from NEOBAR_RENDER_BIN, or a
// sensible default relative to the working directory.
func DefaultBinPath() string {
	if path := os.Getenv("NEOBAR_RENDER_BIN"); path != "" {
		return path
	}
	return "render-host/target/debug/neobar-render"
}

// SpawnHost launches the render-host binary with the CEF libraries on its
// library path. The dynamic linker needs LD_LIBRARY_PATH at process start (and
// CEF's subprocesses inherit it), so it must be set here rather than after launch.
func SpawnHost(binPath string) (*Host, error) {
	if _, err := os.Stat(binPath); err != nil {
		return nil, fmt.Errorf("render host binary %q: %w", binPath, err)
	}

	cefDir, err := resolveCEFDir(binPath)
	if err != nil {
		return nil, err
	}

	cmd := exec.Command(binPath)
	cmd.Env = append(os.Environ(),
		"LD_LIBRARY_PATH="+cefDir+":"+os.Getenv("LD_LIBRARY_PATH"),
	)
	if os.Getenv("RUST_LOG") == "" {
		cmd.Env = append(cmd.Env, "RUST_LOG=info")
	}
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("start render host: %w", err)
	}
	return &Host{cmd: cmd}, nil
}

// Stop terminates the render-host process.
func (h *Host) Stop() {
	if h.cmd.Process != nil {
		_ = h.cmd.Process.Kill()
		_ = h.cmd.Wait()
	}
}

// resolveCEFDir locates the CEF runtime directory (libcef.so + resources). Uses
// NEOBAR_CEF_PATH if set, otherwise globs the cef-dll-sys build output next to the
// binary (the same libraries the linker used, so the ABI matches).
func resolveCEFDir(binPath string) (string, error) {
	if dir := os.Getenv("NEOBAR_CEF_PATH"); dir != "" {
		return dir, nil
	}

	profileDir := filepath.Dir(binPath) // e.g. render-host/target/debug
	matches, err := filepath.Glob(
		filepath.Join(profileDir, "build", "cef-dll-sys-*", "out", "cef_linux_x86_64"),
	)
	if err != nil {
		return "", err
	}
	if len(matches) == 0 {
		return "", fmt.Errorf("no CEF runtime found under %s/build (set NEOBAR_CEF_PATH)", profileDir)
	}

	// Newest wins when stale build dirs linger.
	sort.Slice(matches, func(i, j int) bool {
		return modTime(matches[i]) > modTime(matches[j])
	})
	return matches[0], nil
}

func modTime(path string) int64 {
	info, err := os.Stat(path)
	if err != nil {
		return 0
	}
	return info.ModTime().UnixNano()
}
