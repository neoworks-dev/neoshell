package system

import (
	"strconv"
	"strings"

	"github.com/neoworks/neoshell/internal/shell"
)

type VolumeState struct {
	Volume int  `json:"volume"`
	Muted  bool `json:"muted"`
}

func pollVolume(hub Broadcaster) {
	if state, ok := readVolume(); ok {
		hub.Broadcast("system:volume", state)
	}
}

// watchVolume uses pactl subscribe to react to volume changes instantly.
func watchVolume(hub Broadcaster) {
	shell.Watch("pactl subscribe", func(line string) {
		if strings.Contains(line, "sink") {
			if state, ok := readVolume(); ok {
				hub.Broadcast("system:volume", state)
			}
		}
	})
}

func readVolume() (VolumeState, bool) {
	out, err := shell.Run("wpctl get-volume @DEFAULT_AUDIO_SINK@")
	if err != nil {
		return VolumeState{}, false
	}
	// output: "Volume: 0.75" or "Volume: 0.75 [MUTED]"
	muted := strings.Contains(out, "[MUTED]")
	parts := strings.Fields(out)
	if len(parts) < 2 {
		return VolumeState{}, false
	}
	f, err := strconv.ParseFloat(parts[1], 64)
	if err != nil {
		return VolumeState{}, false
	}
	return VolumeState{
		Volume: int(f * 100),
		Muted:  muted,
	}, true
}
