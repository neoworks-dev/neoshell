import { describe, expect, test } from 'bun:test'
import { Bus, matchesPattern } from '../src/bus.js'
import type { BusMessage } from '../src/bus.js'

describe('pattern matching', () => {
  test('exact, wildcard suffix, and universal patterns', () => {
    expect(matchesPattern('vpn.state', 'vpn.state')).toBe(true)
    expect(matchesPattern('vpn.*', 'vpn.state')).toBe(true)
    expect(matchesPattern('vpn.*', 'vpn.state.detail')).toBe(true)
    expect(matchesPattern('*', 'anything')).toBe(true)
    expect(matchesPattern('vpn.*', 'battery.level')).toBe(false)
    expect(matchesPattern('vpn.state', 'vpn')).toBe(false)
  })
})

describe('publish and subscribe', () => {
  test('subscribers receive matching messages only', () => {
    const bus = new Bus()
    const received: BusMessage[] = []
    bus.subscribe('battery.*', (message) => {
      received.push(message)
    })

    bus.publish('battery.level', { pct: 70 })
    bus.publish('vpn.state', { connected: true })

    expect(received).toHaveLength(1)
    expect(received[0].type).toBe('battery.level')
  })

  test('unsubscribe stops delivery', () => {
    const bus = new Bus()
    const received: BusMessage[] = []
    const unsubscribe = bus.subscribe('a', (message) => {
      received.push(message)
    })

    bus.publish('a', 1)
    unsubscribe()
    bus.publish('a', 2)

    expect(received).toHaveLength(1)
  })
})

describe('retained topics', () => {
  test('a late subscriber replays the retained value on subscribe', () => {
    const bus = new Bus()
    bus.retain('battery.level', { pct: 70 })

    const received: BusMessage[] = []
    bus.subscribe('battery.*', (message) => {
      received.push(message)
    })

    expect(received).toHaveLength(1)
    expect(received[0].data).toEqual({ pct: 70 })
  })

  test('the retain disposer withdraws the value for future subscribers', () => {
    const bus = new Bus()
    const withdraw = bus.retain('battery.level', { pct: 70 })
    withdraw()

    const received: BusMessage[] = []
    bus.subscribe('battery.*', (message) => {
      received.push(message)
    })

    expect(received).toHaveLength(0)
  })
})

describe('request and reply', () => {
  test('call resolves with the data published on the reply topic', async () => {
    const bus = new Bus()
    bus.subscribe('math:double', (message) => {
      const input = message.data as number
      bus.publish(message.replyTo as string, input * 2)
    })

    const result = await bus.call('math:double', 21)

    expect(result).toBe(42)
  })

  test('call rejects on timeout when nothing replies', async () => {
    const bus = new Bus()

    expect(bus.call('nobody:home', null, 20)).rejects.toThrow('timed out')
  })
})
