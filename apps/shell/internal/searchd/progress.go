package searchd

import "sync"

// ProgressInfo is a snapshot of indexing progress, surfaced over IPC so the core
// can show a persistent "indexing…" notification while the daemon works.
type ProgressInfo struct {
	Phase  string `json:"phase"`
	Done   int    `json:"done"`
	Total  int    `json:"total"`
	Active bool   `json:"active"`
}

// progress tracks how many files have been (re)indexed out of how many are
// queued. Total and Done both climb as work is discovered and completed; Active
// is true while Done < Total.
type progress struct {
	mu    sync.Mutex
	phase string
	done  int
	total int
}

func newProgress() *progress {
	return &progress{phase: "idle"}
}

func (p *progress) setPhase(phase string) {
	p.mu.Lock()
	p.phase = phase
	p.mu.Unlock()
}

func (p *progress) addTotal(n int) {
	p.mu.Lock()
	p.total += n
	p.mu.Unlock()
}

func (p *progress) addDone(n int) {
	p.mu.Lock()
	p.done += n
	p.mu.Unlock()
}

func (p *progress) snapshot() ProgressInfo {
	p.mu.Lock()
	defer p.mu.Unlock()
	active := p.done < p.total
	phase := p.phase
	if !active {
		phase = "idle"
	}
	return ProgressInfo{Phase: phase, Done: p.done, Total: p.total, Active: active}
}
