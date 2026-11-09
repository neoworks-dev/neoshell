// A reactive "now" for the relative times a card prints. A card creates one
// and connects it from an effect:
//
//   const clock = new Clock()
//   $effect(() => clock.connect())

const TICK_MS = 30_000

export class Clock {
  now = $state(Date.now())

  connect(): () => void {
    this.now = Date.now()
    const timer = setInterval(() => {
      this.now = Date.now()
    }, TICK_MS)
    return () => {
      clearInterval(timer)
    }
  }
}
