package system

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type BatteryState struct {
	Percent  int    `json:"percent"`
	Charging bool   `json:"charging"`
	Status   string `json:"status"`
}

func pollBattery(hub Broadcaster) {
	for {
		if state, ok := readBattery(); ok {
			hub.Broadcast("system:battery", state)
		}
		time.Sleep(30 * time.Second)
	}
}

func findBattery() (string, error) {
	entries, err := os.ReadDir("/sys/class/power_supply")
	if err != nil {
		return "", err
	}
	for _, e := range entries {
		if strings.HasPrefix(e.Name(), "BAT") {
			return "/sys/class/power_supply/" + e.Name(), nil
		}
	}
	return "", fmt.Errorf("no battery found")
}

func readBattery() (BatteryState, bool) {
	battery, err := findBattery()
	if err != nil {
		return BatteryState{}, false
	}

	capacityRaw, err := os.ReadFile(battery + "/capacity")
	if err != nil {
		return BatteryState{}, false
	}
	statusRaw, _ := os.ReadFile(battery + "/status")

	percent, _ := strconv.Atoi(strings.TrimSpace(string(capacityRaw)))
	status := strings.TrimSpace(string(statusRaw))

	return BatteryState{
		Percent:  percent,
		Charging: status == "Charging",
		Status:   status,
	}, true
}
