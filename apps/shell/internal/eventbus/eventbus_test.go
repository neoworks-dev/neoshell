package eventbus

import (
	"context"
	"path/filepath"
	"sync"
	"testing"
	"time"
)

func TestPublishFansOutToAllHandlers(t *testing.T) {
	bus := New()

	var wg sync.WaitGroup
	wg.Add(2)
	var mu sync.Mutex
	got := map[string]string{}

	bus.Subscribe("voice:listen", func(e Event) {
		mu.Lock()
		got["a"] = e.Topic
		mu.Unlock()
		wg.Done()
	})
	bus.Subscribe("voice:listen", func(e Event) {
		mu.Lock()
		got["b"] = e.Topic
		mu.Unlock()
		wg.Done()
	})
	// A handler on another topic must not fire.
	bus.Subscribe("voice:stop", func(Event) {
		t.Error("voice:stop handler fired for voice:listen event")
	})

	bus.Publish(Event{Topic: "voice:listen"})

	if !waitTimeout(&wg, time.Second) {
		t.Fatal("handlers did not all fire within 1s")
	}
	if got["a"] != "voice:listen" || got["b"] != "voice:listen" {
		t.Fatalf("both handlers should see the topic, got %v", got)
	}
}

func TestEmitServeRoundTrip(t *testing.T) {
	socketPath := filepath.Join(t.TempDir(), "control.sock")
	bus := New()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	received := make(chan Event, 1)
	bus.Subscribe("surface:toggle", func(e Event) { received <- e })

	served := make(chan error, 1)
	go func() { served <- Serve(ctx, socketPath, bus) }()

	waitForSocket(t, socketPath)

	payload := `{"surface":"settings"}`
	if err := Emit(socketPath, Event{Topic: "surface:toggle", Payload: []byte(payload)}); err != nil {
		t.Fatalf("emit: %v", err)
	}

	select {
	case e := <-received:
		if e.Topic != "surface:toggle" || string(e.Payload) != payload {
			t.Fatalf("unexpected event: %+v", e)
		}
	case <-time.After(time.Second):
		t.Fatal("event not received within 1s")
	}

	cancel()
	if err := <-served; err != nil {
		t.Fatalf("serve returned error: %v", err)
	}
}

// TestSubscribeReceivesEmittedEvents covers the bidirectional path: an external
// process subscribes over the socket and receives events emitted by another
// connection. This is the transport the AI sidecar uses for activation events.
func TestSubscribeReceivesEmittedEvents(t *testing.T) {
	socketPath := filepath.Join(t.TempDir(), "control.sock")
	bus := New()

	serveCtx, cancelServe := context.WithCancel(context.Background())
	served := make(chan error, 1)
	go func() { served <- Serve(serveCtx, socketPath, bus) }()
	waitForSocket(t, socketPath)

	received := make(chan Event, 1)
	subCtx, cancelSub := context.WithCancel(context.Background())
	subDone := make(chan error, 1)
	go func() {
		subDone <- Subscribe(subCtx, socketPath, []string{"ai:activate"}, func(e Event) {
			received <- e
		})
	}()

	// Let the subscription register before emitting.
	waitForSubscriber(t, bus, "ai:activate")

	payload := `{"prompt":"hello"}`
	if err := Emit(socketPath, Event{Topic: "ai:activate", Payload: []byte(payload)}); err != nil {
		t.Fatalf("emit: %v", err)
	}

	select {
	case e := <-received:
		if e.Topic != "ai:activate" || string(e.Payload) != payload {
			t.Fatalf("unexpected event: %+v", e)
		}
	case <-time.After(time.Second):
		t.Fatal("subscriber did not receive event within 1s")
	}

	cancelSub()
	<-subDone
	// The subscriber's bus handler must be gone after it disconnects.
	waitForNoSubscriber(t, bus, "ai:activate")

	cancelServe()
	if err := <-served; err != nil {
		t.Fatalf("serve returned error: %v", err)
	}
}

func waitForSubscriber(t *testing.T, bus *Bus, topic string) {
	t.Helper()
	for range 100 {
		bus.mu.RLock()
		count := len(bus.subs[topic])
		bus.mu.RUnlock()
		if count > 0 {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("no subscriber registered for %q", topic)
}

func waitForNoSubscriber(t *testing.T, bus *Bus, topic string) {
	t.Helper()
	for range 100 {
		bus.mu.RLock()
		count := len(bus.subs[topic])
		bus.mu.RUnlock()
		if count == 0 {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("subscriber for %q leaked after disconnect", topic)
}

func waitTimeout(wg *sync.WaitGroup, d time.Duration) bool {
	done := make(chan struct{})
	go func() { wg.Wait(); close(done) }()
	select {
	case <-done:
		return true
	case <-time.After(d):
		return false
	}
}

func waitForSocket(t *testing.T, socketPath string) {
	t.Helper()
	for range 100 {
		if err := Emit(socketPath, Event{Topic: "__ping"}); err == nil {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatal("socket never became reachable")
}
