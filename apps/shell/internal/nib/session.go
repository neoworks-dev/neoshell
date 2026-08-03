package nib

import (
	"context"
	"errors"
	"fmt"
	"log"
	"sort"
	"sync"
)

// Session status as the shell reports it. These are not nib's own status
// values: nib says "idle" both when a turn finished and when the loop is parked
// on an approval, and the difference is the whole user experience.
const (
	StatusDown     = "down"     // the backend is not reachable
	StatusIdle     = "idle"     // nothing in flight
	StatusRunning  = "running"  // a turn is under way
	StatusAwaiting = "awaiting" // parked, waiting for a human to approve a tool
)

// Approval is a tool call waiting for a yes or no.
type Approval struct {
	ToolUseID string `json:"toolUseId"`
	Name      string `json:"name"`
	Seq       int    `json:"seq"`
}

// Session owns one long-lived nib conversation and the stream that feeds it.
type Session struct {
	client *Client
	id     string

	mu      sync.Mutex
	status  string
	pending map[string]Approval
	lastSeq int

	// on receives every stream event after the session has updated its own
	// state, so a subscriber always sees consistent status alongside the event.
	on func(Event)
}

// Open resumes an existing session or creates a new one.
//
// Resuming matters more than it looks: nib keeps the transcript on disk, so a
// shell restart that reuses the id keeps the whole conversation. A stale id
// (the sessions directory was cleared) falls through to a fresh session rather
// than failing to start.
func Open(ctx context.Context, client *Client, request CreateSessionRequest, resumeID string) (*Session, error) {
	session := &Session{
		client:  client,
		status:  StatusIdle,
		pending: make(map[string]Approval),
	}

	if resumeID != "" {
		snapshot, err := client.GetSession(ctx, resumeID)
		switch {
		case err == nil:
			session.adopt(snapshot)
			return session, nil
		case errors.Is(err, ErrNotFound):
			log.Printf("nib: session %s is gone; starting a new one", resumeID)
		default:
			return nil, err
		}
	}

	snapshot, err := client.CreateSession(ctx, request)
	if err != nil {
		return nil, err
	}
	session.adopt(snapshot)
	return session, nil
}

// adopt seeds state from a snapshot, including any approvals the session was
// already parked on. The idle event carries no ids, so this is the only way a
// reconnecting shell learns what is waiting.
func (s *Session) adopt(snapshot Snapshot) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.id = snapshot.ID
	s.lastSeq = snapshot.LastSeq
	s.pending = make(map[string]Approval, len(snapshot.PendingApprovals))
	for _, toolUseID := range snapshot.PendingApprovals {
		s.pending[toolUseID] = Approval{ToolUseID: toolUseID}
	}
	s.status = statusFor(snapshot.Status, snapshot.StopReason, len(s.pending))
}

func statusFor(nibStatus, stopReason string, pending int) string {
	switch {
	case nibStatus == "terminated":
		return StatusDown
	case nibStatus == "running":
		return StatusRunning
	case stopReason == IdleRequiresAction || pending > 0:
		return StatusAwaiting
	default:
		return StatusIdle
	}
}

func (s *Session) ID() string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.id
}

// Subscribe sets the callback that receives every stream event. It must be set
// before Run.
func (s *Session) Subscribe(on func(Event)) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.on = on
}

// Run holds the event stream open until ctx is done. It blocks, so callers run
// it in a goroutine.
func (s *Session) Run(ctx context.Context) {
	s.mu.Lock()
	id, cursor := s.id, s.lastSeq
	s.mu.Unlock()
	s.client.Stream(ctx, id, cursor, s.handle)
}

// handle folds one event into session state, then forwards it.
func (s *Session) handle(event Event) {
	s.mu.Lock()
	if event.Seq > s.lastSeq {
		s.lastSeq = event.Seq
	}
	switch event.Type {
	case EventStatusRunning:
		s.status = StatusRunning
	case EventStatusIdle:
		// "requires_action" is not the end of a turn. Treating it as one is how
		// a client ends up silently waiting forever for a reply that is sitting
		// behind an unanswered approval.
		if event.StopReason == IdleRequiresAction || len(s.pending) > 0 {
			s.status = StatusAwaiting
		} else {
			s.status = StatusIdle
		}
	case EventStatusTerminated:
		s.status = StatusDown
	case EventToolUse:
		if event.Permission == "ask" {
			s.pending[event.ToolUseID] = Approval{
				ToolUseID: event.ToolUseID,
				Name:      event.Name,
				Seq:       event.Seq,
			}
		}
	case EventToolResult:
		// A result means the call is settled, however it was answered — an
		// approval granted elsewhere, or an abort that denied it.
		delete(s.pending, event.ToolUseID)
	}
	on := s.on
	s.mu.Unlock()

	if on != nil {
		on(event)
	}
}

// State is the snapshot the shell broadcasts to its surfaces.
type State struct {
	Status    string     `json:"status"`
	SessionID string     `json:"sessionId"`
	Approvals []Approval `json:"approvals"`
}

func (s *Session) State() State {
	s.mu.Lock()
	defer s.mu.Unlock()
	return State{Status: s.status, SessionID: s.id, Approvals: s.approvals()}
}

// approvals returns pending approvals oldest first. Caller holds the lock.
func (s *Session) approvals() []Approval {
	list := make([]Approval, 0, len(s.pending))
	for _, approval := range s.pending {
		list = append(list, approval)
	}
	sort.Slice(list, func(i, j int) bool { return list[i].Seq < list[j].Seq })
	return list
}

// Ask submits a user message. The reply arrives on the already-open stream, so
// there is nothing to wait for here.
func (s *Session) Ask(ctx context.Context, text, deliverAs string) error {
	if text == "" {
		return fmt.Errorf("nib: empty message")
	}
	return s.client.PostEvents(ctx, s.ID(), UserMessage(text, deliverAs))
}

// Interrupt aborts the current turn. nib unwinds the loop and denies every
// outstanding approval, so the shell does not have to clean them up itself.
func (s *Session) Interrupt(ctx context.Context) error {
	return s.client.PostEvents(ctx, s.ID(), UserInterrupt())
}

// Confirm answers one pending approval.
func (s *Session) Confirm(ctx context.Context, toolUseID, result, reason string) error {
	if !ValidApproval(result) {
		return fmt.Errorf("nib: %q is not an approval result", result)
	}
	return s.client.PostEvents(ctx, s.ID(), UserToolConfirmation(toolUseID, result, reason))
}

// AskOnce sends a prompt and waits for the whole reply.
//
// It is for side questions — a yes/no gate, a classification — that must not
// enter the user's conversation. Run it on a session of its own, not the shell's
// main one, or the transcript fills with machinery the user never asked about.
func (s *Session) AskOnce(ctx context.Context, prompt string) (string, error) {
	replies := make(chan string, 1)
	var text string

	s.Subscribe(func(event Event) {
		switch event.Type {
		case EventMessageStart:
			text = ""
		case EventMessageDelta:
			text += event.Text
		case EventMessageEnd:
			if final := TextContent(event.Content); final != "" {
				text = final
			}
		case EventStatusIdle:
			if event.StopReason == IdleRequiresAction {
				// A gate session has no tools, so this should not happen. If it
				// does, refusing is better than parking forever.
				_ = s.Interrupt(ctx)
				return
			}
			select {
			case replies <- text:
			default:
			}
		}
	})
	defer s.Subscribe(nil)

	if err := s.Ask(ctx, prompt, DeliverSteer); err != nil {
		return "", err
	}
	select {
	case <-ctx.Done():
		return "", ctx.Err()
	case reply := <-replies:
		return reply, nil
	}
}

// ConfirmOldest answers the longest-waiting approval. This is what the yes/no
// keybinds bind to: the model can park on several calls at once, and answering
// them in arrival order matches the order the notch lists them in.
func (s *Session) ConfirmOldest(ctx context.Context, result string) error {
	s.mu.Lock()
	list := s.approvals()
	s.mu.Unlock()
	if len(list) == 0 {
		return fmt.Errorf("nib: nothing is waiting for approval")
	}
	return s.Confirm(ctx, list[0].ToolUseID, result, "")
}
