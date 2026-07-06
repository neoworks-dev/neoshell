package voice

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"os"
	"os/exec"
	"sync"
	"syscall"
	"time"
)

// sidecar spawns and holds a persistent NDJSON connection to one Python sidecar.
// It supervises the process in its own group and exposes a line channel plus a
// locked writer.
type sidecar struct {
	name   string
	module string
	sock   string

	cmd  *exec.Cmd
	conn net.Conn

	writeMu sync.Mutex
	lines   chan []byte
	done    chan struct{}
}

// startSidecar launches `python -m <module>` and dials its socket once it
// appears. Best-effort: a missing interpreter or socket returns an error so the
// caller can disable voice without failing the shell.
func startSidecar(name, module, sock string, extraEnv []string) (*sidecar, error) {
	// Remove a stale socket so a crashed prior run can't fool the dial.
	_ = os.Remove(sock)

	cmd := exec.Command(pythonBin(), "-m", module)
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = append(os.Environ(), extraEnv...)
	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("start %s sidecar: %w", name, err)
	}

	conn, err := dialWithRetry(sock, 60*time.Second)
	if err != nil {
		_ = cmd.Process.Kill()
		return nil, fmt.Errorf("dial %s sidecar: %w", name, err)
	}

	s := &sidecar{
		name:   name,
		module: module,
		sock:   sock,
		cmd:    cmd,
		conn:   conn,
		lines:  make(chan []byte, 64),
		done:   make(chan struct{}),
	}
	go s.readLoop()
	go func() {
		_ = cmd.Wait()
		log.Printf("voice: %s sidecar exited", name)
	}()
	return s, nil
}

// dialWithRetry waits for the socket file to appear and connects, since the
// sidecar binds the socket before its (slow) model load completes.
func dialWithRetry(sock string, timeout time.Duration) (net.Conn, error) {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		conn, err := net.Dial("unix", sock)
		if err == nil {
			return conn, nil
		}
		time.Sleep(200 * time.Millisecond)
	}
	return nil, fmt.Errorf("socket %s never appeared", sock)
}

// readLoop forwards each JSON line from the sidecar onto lines until the
// connection closes.
func (s *sidecar) readLoop() {
	defer close(s.done)
	scanner := bufio.NewScanner(s.conn)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	for scanner.Scan() {
		line := make([]byte, len(scanner.Bytes()))
		copy(line, scanner.Bytes())
		select {
		case s.lines <- line:
		default:
			// Reader fell behind; drop rather than block the sidecar.
		}
	}
}

func (s *sidecar) send(v any) error {
	raw, err := json.Marshal(v)
	if err != nil {
		return err
	}
	raw = append(raw, '\n')
	s.writeMu.Lock()
	defer s.writeMu.Unlock()
	_, err = s.conn.Write(raw)
	return err
}

func (s *sidecar) stop() {
	if s.conn != nil {
		_ = s.conn.Close()
	}
	if s.cmd != nil && s.cmd.Process != nil {
		// Kill the whole process group; the sidecar runs Setpgid.
		_ = syscall.Kill(-s.cmd.Process.Pid, syscall.SIGTERM)
	}
}
