package timers

import "testing"

func TestTimerAndTrackLifecycle(t *testing.T) {
	t.Setenv("XDG_DATA_HOME", t.TempDir())
	service := New(func(State) {})

	service.StartTimer("tea", 60)
	if got := len(service.Snapshot().Timers); got != 1 {
		t.Fatalf("expected 1 timer, got %d", got)
	}
	id := service.Snapshot().Timers[0].ID
	service.StopTimer(id)
	if got := len(service.Snapshot().Timers); got != 0 {
		t.Fatalf("expected timer removed, got %d", got)
	}

	// Zero/negative durations are ignored.
	service.StartTimer("bad", 0)
	if got := len(service.Snapshot().Timers); got != 0 {
		t.Fatalf("zero-duration timer should be ignored, got %d", got)
	}

	service.StartTrack("work")
	snapshot := service.Snapshot()
	if len(snapshot.Sessions) != 1 || snapshot.Sessions[0].StoppedAt != 0 {
		t.Fatalf("expected 1 running session, got %+v", snapshot.Sessions)
	}
	service.StopTrack("")
	if service.Snapshot().Sessions[0].StoppedAt == 0 {
		t.Fatalf("StopTrack should stop the running session")
	}
}
