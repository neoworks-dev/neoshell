package agentd

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/neoworks/neoshell/internal/config"
	"github.com/neoworks/neoshell/internal/nib"
	"github.com/neoworks/neoshell/internal/server"
)

// nibLauncher resolves how to start the agent backend.
//
// Source is preferred over the prebuilt binary when a checkout is configured,
// because the committed binary lags the repository and a stale backend fails in
// ways that look like shell bugs.
func nibLauncher() (command string, args []string, dir string, err error) {
	if binary := os.Getenv("NEOSHELL_NIB_BIN"); binary != "" {
		return binary, nil, "", nil
	}
	if source := os.Getenv("NEOSHELL_NIB_DIR"); source != "" {
		bun, lookErr := exec.LookPath("bun")
		if lookErr != nil {
			return "", nil, "", fmt.Errorf("NEOSHELL_NIB_DIR is set but bun is not on PATH: %w", lookErr)
		}
		return bun, []string{"run", filepath.Join("src", "index.ts"), "--"}, source, nil
	}
	binary, lookErr := exec.LookPath("nib-server")
	if lookErr != nil {
		return "", nil, "", fmt.Errorf("no agent backend: set NEOSHELL_NIB_BIN or NEOSHELL_NIB_DIR, or put nib-server on PATH")
	}
	return binary, nil, "", nil
}

// startNib builds the supervisor for the agent backend. The caller runs it and
// is responsible for stopping it.
//
// The backend is handed two things it cannot discover on its own: where the
// shell's HTTP surface is, and the token that lets it call capabilities. The
// neoshell extension inside nib reads both from its environment.
func newSupervisor(port int, cfg *config.Store) (*nib.Supervisor, error) {
	command, args, dir, err := nibLauncher()
	if err != nil {
		return nil, err
	}

	socket := nib.SocketPath()
	args = append(args, "--socket", socket)
	if workspace, _ := cfg.Get("nib.workspace"); workspace != nil {
		if path, ok := workspace.(string); ok && path != "" {
			args = append(args, "--workspace", os.ExpandEnv(path))
		}
	}

	return nib.NewSupervisor(nib.Options{
		Command:    command,
		Args:       args,
		Dir:        dir,
		SocketPath: socket,
		Env: []string{
			fmt.Sprintf("NEOSHELL_URL=http://127.0.0.1:%d", port),
			"NEOSHELL_TOKEN=" + server.AgentToken(),
		},
	}), nil
}

// Start supervises the backend and keeps the server's session attached to
// whatever process is currently alive. It returns immediately; everything below
// runs for the life of ctx.
//
// A missing backend is not fatal. The rest of the shell — bar, dock, launcher,
// widgets — works without it, and the notch reports the backend as down rather
// than hanging on a request that will never be answered.
func Start(ctx context.Context, srv *server.Server, hub *server.Hub, cfg *config.Store, port int) {
	supervisor, err := newSupervisor(port, cfg)
	if err != nil {
		log.Printf("agent backend disabled: %v", err)
		srv.DetachAgent(err.Error())
		return
	}

	supervisor.OnState(func(state nib.SupervisorState) {
		if !state.Healthy {
			srv.DetachAgent(state.Error)
		}
		hub.Broadcast("agent:backend", state)
	})
	// The restart keybind clears the failure latch, which is the only way back
	// from a backend that failed to start enough times to give up.
	srv.OnAgentRestart(supervisor.Retry)

	supervisor.OnHealthy(func(ctx context.Context) {
		attachAgentSession(ctx, srv, supervisor, cfg)
	})
	go supervisor.Run(ctx)
	context.AfterFunc(ctx, supervisor.Stop)
}

// attachAgentSession opens (or resumes) the shell's session and starts reading
// its stream. Called on every successful backend start, including restarts.
func attachAgentSession(ctx context.Context, srv *server.Server, supervisor *nib.Supervisor, cfg *config.Store) {
	client := supervisor.Client()

	session, err := nib.Open(ctx, client, nib.CreateSessionRequest{
		Workspace:          expandedConfig(cfg, "nib.workspace"),
		Title:              "neoshell",
		Provider:           configString(cfg, "nib.provider"),
		Model:              configString(cfg, "nib.model"),
		ThinkingLevel:      configString(cfg, "nib.thinking"),
		AppendSystemPrompt: DesktopSystemPrompt,
	}, configString(cfg, "nib.sessionId"))
	if err != nil {
		log.Printf("agent session: %v", err)
		srv.DetachAgent(err.Error())
		return
	}
	// Remember the id so a shell restart resumes this conversation instead of
	// starting a stranger.
	if err := cfg.Set("nib.sessionId", session.ID()); err != nil {
		log.Printf("agent session: persist id: %v", err)
	}

	srv.AttachAgent(client, session)
	go session.Run(ctx)
	go refreshAgentTools(ctx, srv, client)
}

// refreshAgentTools loads nib's tool list so the notch can render calls with
// real labels, and reloads extensions if the shell's own tools are missing —
// which happens when the backend outlived a shell restart and loaded its
// extension against a listener that was gone.
func refreshAgentTools(ctx context.Context, srv *server.Server, client *nib.Client) {
	tools, err := client.Tools(ctx)
	if err != nil {
		log.Printf("agent tools: %v", err)
		return
	}
	if !hasDesktopTools(tools) {
		if reloaded := reloadExtensions(ctx, client); reloaded {
			if refreshed, err := client.Tools(ctx); err == nil {
				tools = refreshed
			}
		}
	}
	if !hasDesktopTools(tools) {
		log.Printf("agent: the neoshell extension registered no tools — is it linked into ~/.nib/extensions?")
	}
	srv.SetAgentTools(tools)
}

func hasDesktopTools(tools []nib.ToolInfo) bool {
	for _, tool := range tools {
		if strings.HasPrefix(tool.Name, "neoshell_") {
			return true
		}
	}
	return false
}

// reloadExtensions retries past a 409, which means a session is mid-turn.
func reloadExtensions(ctx context.Context, client *nib.Client) bool {
	for attempt := 0; attempt < 3; attempt++ {
		err := client.Reload(ctx)
		if err == nil {
			return true
		}
		if !errors.Is(err, nib.ErrBusy) {
			log.Printf("agent: reload extensions: %v", err)
			return false
		}
		select {
		case <-ctx.Done():
			return false
		case <-time.After(2 * time.Second):
		}
	}
	return false
}

func configString(cfg *config.Store, key string) string {
	value, ok := cfg.Get(key)
	if !ok {
		return ""
	}
	text, _ := value.(string)
	return text
}

func expandedConfig(cfg *config.Store, key string) string {
	return os.ExpandEnv(configString(cfg, key))
}
