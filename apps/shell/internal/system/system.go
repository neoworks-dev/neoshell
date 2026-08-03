package system

type System struct{}

func New() *System { return &System{} }

type Broadcaster interface {
	Broadcast(topic string, data any)
}

// Poll starts all system data pollers. Blocks — run in a goroutine.
func (s *System) Poll(hub Broadcaster) {
	go pollBattery(hub)
	go pollVolume(hub)
	go watchVolume(hub)
}
