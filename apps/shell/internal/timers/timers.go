// Package timers is the backend for the palette's timer and time-tracking
// providers. Countdown timers fire a desktop notification on expiry (via
// notify-send, which reaches neoshell's own notification daemon over D-Bus);
// tracking sessions record labeled start/stop spans. State persists to disk so
// it survives restarts, and every change is pushed to the frontend.
package timers

import (
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"sync"
	"time"
)

type Timer struct {
	ID     string `json:"id"`
	Label  string `json:"label"`
	EndsAt int64  `json:"endsAt"` // unix ms
}

type Session struct {
	ID        string `json:"id"`
	Label     string `json:"label"`
	StartedAt int64  `json:"startedAt"` // unix ms
	StoppedAt int64  `json:"stoppedAt"` // unix ms; 0 while running
}

type State struct {
	Timers   []Timer   `json:"timers"`
	Sessions []Session `json:"sessions"`
}

type Service struct {
	mu        sync.Mutex
	path      string
	state     State
	seq       int
	broadcast func(State)
}

func now() int64 { return time.Now().UnixMilli() }

// New loads persisted state, pushes it once (so late subscribers hydrate), and
// starts the expiry ticker.
func New(broadcast func(State)) *Service {
	service := &Service{path: dataPath(), broadcast: broadcast}
	service.load()
	broadcast(service.snapshotLocked())
	go service.tick()
	return service
}

func (s *Service) nextID() string {
	s.seq++
	return strconv.FormatInt(now(), 36) + "-" + strconv.Itoa(s.seq)
}

// StartTimer adds a countdown of `seconds` seconds. A non-positive duration is
// ignored.
func (s *Service) StartTimer(label string, seconds int) {
	if seconds <= 0 {
		return
	}
	s.mu.Lock()
	s.state.Timers = append(s.state.Timers, Timer{
		ID:     s.nextID(),
		Label:  label,
		EndsAt: now() + int64(seconds)*1000,
	})
	s.persistAndPublishLocked()
	s.mu.Unlock()
}

func (s *Service) StopTimer(id string) {
	s.mu.Lock()
	s.state.Timers = filterTimers(s.state.Timers, func(t Timer) bool { return t.ID != id })
	s.persistAndPublishLocked()
	s.mu.Unlock()
}

func (s *Service) StartTrack(label string) {
	s.mu.Lock()
	s.state.Sessions = append(s.state.Sessions, Session{
		ID:        s.nextID(),
		Label:     label,
		StartedAt: now(),
	})
	s.persistAndPublishLocked()
	s.mu.Unlock()
}

// StopTrack stops the given session, or the most recent running one when id is
// empty.
func (s *Service) StopTrack(id string) {
	s.mu.Lock()
	for i := len(s.state.Sessions) - 1; i >= 0; i-- {
		session := &s.state.Sessions[i]
		if session.StoppedAt != 0 {
			continue
		}
		if id == "" || session.ID == id {
			session.StoppedAt = now()
			if id == "" {
				break
			}
		}
	}
	s.persistAndPublishLocked()
	s.mu.Unlock()
}

func (s *Service) Snapshot() State {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.snapshotLocked()
}

// tick fires expired timers once per second.
func (s *Service) tick() {
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()
	for range ticker.C {
		s.fireExpired()
	}
}

func (s *Service) fireExpired() {
	s.mu.Lock()
	current := now()
	var expired []Timer
	kept := s.state.Timers[:0]
	for _, timer := range s.state.Timers {
		if timer.EndsAt <= current {
			expired = append(expired, timer)
		} else {
			kept = append(kept, timer)
		}
	}
	if len(expired) == 0 {
		s.mu.Unlock()
		return
	}
	s.state.Timers = kept
	s.persistAndPublishLocked()
	s.mu.Unlock()

	for _, timer := range expired {
		notify(timer.Label)
	}
}

func notify(label string) {
	body := "Timer finished"
	if label != "" {
		body = label
	}
	// Best-effort; the notification daemon may claim the bus.
	_ = exec.Command("notify-send", "-a", "neoshell", "Timer", body).Start()
}

func (s *Service) snapshotLocked() State {
	timersCopy := append([]Timer(nil), s.state.Timers...)
	sessionsCopy := append([]Session(nil), s.state.Sessions...)
	return State{Timers: timersCopy, Sessions: sessionsCopy}
}

func (s *Service) persistAndPublishLocked() {
	s.save()
	if s.broadcast != nil {
		s.broadcast(s.snapshotLocked())
	}
}

func filterTimers(timers []Timer, keep func(Timer) bool) []Timer {
	kept := timers[:0]
	for _, timer := range timers {
		if keep(timer) {
			kept = append(kept, timer)
		}
	}
	return kept
}

func dataPath() string {
	base := os.Getenv("XDG_DATA_HOME")
	if base == "" {
		base = filepath.Join(os.Getenv("HOME"), ".local", "share")
	}
	return filepath.Join(base, "neoshell", "timers.json")
}

func (s *Service) load() {
	data, err := os.ReadFile(s.path)
	if err != nil {
		return
	}
	_ = json.Unmarshal(data, &s.state)
}

func (s *Service) save() {
	if err := os.MkdirAll(filepath.Dir(s.path), 0o755); err != nil {
		return
	}
	data, err := json.Marshal(s.state)
	if err != nil {
		return
	}
	tmp := s.path + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return
	}
	_ = os.Rename(tmp, s.path)
}
