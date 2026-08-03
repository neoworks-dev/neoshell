package nib

import (
	"context"
	"errors"
	"log"
	"os"
	"os/exec"
	"sync"
	"syscall"
	"time"
)

var (
	// errExitedEarly means the backend quit cleanly before it ever answered a
	// health probe — almost always a bad flag or a missing binary.
	errExitedEarly = errors.New("nib: exited before becoming ready")
	errUnhealthy   = errors.New("nib: did not become ready in time")
)

// Restart policy. The backoff keeps a crash-looping backend from burning CPU,
// and the failure latch keeps it from doing so forever: after enough failures
// in a short window the supervisor stops and says so, because at that point the
// problem is configuration and retrying will not fix it.
const (
	healthPollInterval = 100 * time.Millisecond
	healthTimeout      = 30 * time.Second
	minBackoff         = time.Second
	maxBackoff         = 30 * time.Second
	// healthyFor is how long a run must last before its failures are forgiven.
	healthyFor = time.Minute
	// maxFailures is how many consecutive quick failures latch the supervisor.
	maxFailures  = 5
	stopGrace    = 5 * time.Second
	shutdownWait = 100 * time.Millisecond
)

// Options configures a supervised nib process.
type Options struct {
	// Command and Args launch the backend. Args must already include whatever
	// separator the launcher needs (`bun run start --`, say).
	Command string
	Args    []string
	Dir     string

	SocketPath string
	// Env entries are appended to the shell's own environment.
	Env []string

	// OnHealthy is called after each successful start, so the caller can open a
	// session against a backend it knows is up.
	OnHealthy func(context.Context)
}

// SupervisorState is what the shell shows when the backend is not simply up.
type SupervisorState struct {
	Running  bool   `json:"running"`
	Healthy  bool   `json:"healthy"`
	Attempts int    `json:"attempts"`
	Error    string `json:"error,omitempty"`
	// Latched means the supervisor has given up until told to try again.
	Latched bool `json:"latched"`
}

// Supervisor keeps one nib process alive.
type Supervisor struct {
	opts   Options
	client *Client

	mu      sync.Mutex
	cmd     *exec.Cmd
	state   SupervisorState
	onState func(SupervisorState)

	// retry unlatches a stopped supervisor. Buffered so a signal sent while the
	// loop is elsewhere is not lost.
	retry chan struct{}
}

func NewSupervisor(opts Options) *Supervisor {
	return &Supervisor{
		opts:   opts,
		client: NewClient(opts.SocketPath),
		retry:  make(chan struct{}, 1),
	}
}

// Client returns the HTTP client pointed at the supervised backend.
func (s *Supervisor) Client() *Client { return s.client }

// OnState registers a state observer.
func (s *Supervisor) OnState(fn func(SupervisorState)) {
	s.mu.Lock()
	s.onState = fn
	s.mu.Unlock()
}

// OnHealthy registers the callback that runs after each successful start. It is
// a setter rather than an Options field because the callback usually needs the
// supervisor itself, which does not exist yet when Options is built.
func (s *Supervisor) OnHealthy(fn func(context.Context)) {
	s.mu.Lock()
	s.opts.OnHealthy = fn
	s.mu.Unlock()
}

func (s *Supervisor) State() SupervisorState {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.state
}

func (s *Supervisor) setState(update func(*SupervisorState)) {
	s.mu.Lock()
	update(&s.state)
	state, observer := s.state, s.onState
	s.mu.Unlock()
	if observer != nil {
		observer(state)
	}
}

// Retry clears the failure latch and asks for another start attempt.
func (s *Supervisor) Retry() {
	s.setState(func(state *SupervisorState) {
		state.Latched = false
		state.Attempts = 0
		state.Error = ""
	})
	select {
	case s.retry <- struct{}{}:
	default:
	}
}

// Run supervises the backend until ctx is done. It blocks.
func (s *Supervisor) Run(ctx context.Context) {
	backoff := minBackoff
	failures := 0

	for ctx.Err() == nil {
		started := time.Now()
		err := s.runOnce(ctx)
		if ctx.Err() != nil {
			return
		}

		if time.Since(started) >= healthyFor {
			// It ran long enough to count as working; whatever killed it is not
			// a startup problem, so start over from the shortest delay.
			failures, backoff = 0, minBackoff
		} else {
			failures++
		}

		message := "exited"
		if err != nil {
			message = err.Error()
		}
		s.setState(func(state *SupervisorState) {
			state.Running, state.Healthy = false, false
			state.Attempts, state.Error = failures, message
		})

		if failures >= maxFailures {
			log.Printf("nib: giving up after %d failed starts (%s); `neoshell emit agent:restart` to retry", failures, message)
			s.setState(func(state *SupervisorState) { state.Latched = true })
			select {
			case <-ctx.Done():
				return
			case <-s.retry:
				failures, backoff = 0, minBackoff
				continue
			}
		}

		log.Printf("nib: %s; restarting in %s", message, backoff)
		select {
		case <-ctx.Done():
			return
		case <-s.retry:
		case <-time.After(backoff):
		}
		if backoff *= 2; backoff > maxBackoff {
			backoff = maxBackoff
		}
	}
}

// runOnce starts the backend, waits for it to answer, and blocks until it
// exits. The returned error describes why it stopped, if anything went wrong.
func (s *Supervisor) runOnce(ctx context.Context) error {
	// nib removes a stale socket itself, but doing it here too means a restart
	// after a hard kill is deterministic rather than dependent on the child.
	_ = os.Remove(s.opts.SocketPath)

	cmd := exec.CommandContext(ctx, s.opts.Command, s.opts.Args...)
	cmd.Dir = s.opts.Dir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = append(os.Environ(), s.opts.Env...)
	// Its own process group, so the whole tree (bun and anything it spawns)
	// goes down together rather than leaving orphans holding the socket.
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}

	if err := cmd.Start(); err != nil {
		return err
	}
	s.mu.Lock()
	s.cmd = cmd
	s.mu.Unlock()
	s.setState(func(state *SupervisorState) { state.Running = true })

	exited := make(chan error, 1)
	go func() { exited <- cmd.Wait() }()

	if err := s.waitHealthy(ctx, exited); err != nil {
		s.terminate(cmd)
		<-exited
		return err
	}

	s.setState(func(state *SupervisorState) {
		state.Healthy = true
		state.Error = ""
	})
	log.Printf("nib: ready on %s", s.opts.SocketPath)
	s.mu.Lock()
	onHealthy := s.opts.OnHealthy
	s.mu.Unlock()
	if onHealthy != nil {
		go onHealthy(ctx)
	}

	select {
	case <-ctx.Done():
		s.terminate(cmd)
		<-exited
		return ctx.Err()
	case err := <-exited:
		return err
	}
}

// waitHealthy polls until the backend answers, the deadline passes, or the
// child dies. Watching the exit channel matters: without it a backend that
// fails instantly would still cost the full health timeout before restarting.
func (s *Supervisor) waitHealthy(ctx context.Context, exited <-chan error) error {
	deadline := time.After(healthTimeout)
	ticker := time.NewTicker(healthPollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case err := <-exited:
			if err != nil {
				return err
			}
			return errExitedEarly
		case <-deadline:
			return errUnhealthy
		case <-ticker.C:
			probe, cancel := context.WithTimeout(ctx, healthPollInterval*5)
			err := s.client.Health(probe)
			cancel()
			if err == nil {
				return nil
			}
		}
	}
}

// Stop terminates the backend and waits briefly for it to go.
func (s *Supervisor) Stop() {
	s.mu.Lock()
	cmd := s.cmd
	s.cmd = nil
	s.mu.Unlock()
	if cmd != nil {
		s.terminate(cmd)
	}
}

// terminate signals the whole process group, escalating if it does not go.
func (s *Supervisor) terminate(cmd *exec.Cmd) {
	if cmd.Process == nil {
		return
	}
	pgid, err := syscall.Getpgid(cmd.Process.Pid)
	if err != nil {
		// Already gone, or never got a group. Signal the process directly.
		_ = cmd.Process.Signal(syscall.SIGTERM)
		return
	}
	_ = syscall.Kill(-pgid, syscall.SIGTERM)

	deadline := time.Now().Add(stopGrace)
	for time.Now().Before(deadline) {
		if err := syscall.Kill(-pgid, 0); err != nil {
			return
		}
		time.Sleep(shutdownWait)
	}
	_ = syscall.Kill(-pgid, syscall.SIGKILL)
}
