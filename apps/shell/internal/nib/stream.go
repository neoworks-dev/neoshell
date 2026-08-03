package nib

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"
)

// reconnectDelay is how long to wait before redialling a dropped stream. Short,
// because the gap is replayed from the cursor and nothing is lost — the only
// cost of reconnecting is the round trip.
const reconnectDelay = 500 * time.Millisecond

// Stream reads a session's event stream until ctx is done, calling on for every
// frame, and reconnecting from the last sequence number it saw.
//
// The stream is opened once and held for the life of the session. That is not
// an optimisation: nib writes nothing to an idle stream until its 15-second
// keepalive, so a client that opens a stream per turn waits fifteen seconds
// before hearing anything. Keeping it open means the first token of a reply
// arrives as soon as the model produces it.
func (c *Client) Stream(ctx context.Context, id string, afterSeq int, on func(Event)) {
	cursor := afterSeq
	for ctx.Err() == nil {
		last, err := c.readStream(ctx, id, cursor, on)
		if last > cursor {
			cursor = last
		}
		if ctx.Err() != nil {
			return
		}
		if err != nil {
			log.Printf("nib stream: %v (reconnecting from seq %d)", err, cursor)
		}
		select {
		case <-ctx.Done():
			return
		case <-time.After(reconnectDelay):
		}
	}
}

// readStream holds one connection, returning the highest sequence number seen
// so a reconnect resumes exactly where it left off.
func (c *Client) readStream(ctx context.Context, id string, afterSeq int, on func(Event)) (int, error) {
	url := c.base + "/v1/sessions/" + id + "/stream"
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return afterSeq, err
	}
	request.Header.Set("Accept", "text/event-stream")
	if afterSeq > 0 {
		// nib replays the gap from this cursor and attaches live in the same
		// tick, so no event is missed and none is delivered twice.
		request.Header.Set("Last-Event-ID", strconv.Itoa(afterSeq))
	}

	response, err := c.stream.Do(request)
	if err != nil {
		return afterSeq, err
	}
	defer response.Body.Close()
	if response.StatusCode >= 400 {
		return afterSeq, statusError(http.MethodGet, "/stream", response)
	}

	last := afterSeq
	scanner := bufio.NewScanner(response.Body)
	// A single frame can carry a whole file's contents in a tool result, so the
	// default 64 KiB line limit is far too small.
	scanner.Buffer(make([]byte, 0, 64*1024), 8*1024*1024)

	var data bytes.Buffer
	for scanner.Scan() {
		line := scanner.Bytes()
		switch {
		case len(line) == 0:
			// Blank line ends a frame.
			if data.Len() > 0 {
				if event, ok := decodeEvent(data.Bytes()); ok {
					if event.Seq > last {
						last = event.Seq
					}
					on(event)
				}
				data.Reset()
			}
		case line[0] == ':':
			// Keepalive comment. Its only job is to keep the connection warm.
		case bytes.HasPrefix(line, []byte("data:")):
			data.Write(bytes.TrimPrefix(bytes.TrimPrefix(line, []byte("data:")), []byte(" ")))
		default:
			// "id:" and "event:" carry nothing the payload does not already —
			// seq and type are both inside the JSON.
		}
	}
	return last, scanner.Err()
}

func decodeEvent(payload []byte) (Event, bool) {
	var event Event
	if err := json.Unmarshal(payload, &event); err != nil {
		log.Printf("nib stream: bad frame: %v", err)
		return Event{}, false
	}
	return event, event.Type != ""
}
