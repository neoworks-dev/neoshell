import { describe, expect, test } from 'bun:test'
import { Kernel } from '../src/kernel.js'
import type { Context } from '../src/context.js'
import type { Plugin } from '../src/types.js'
import type { Fiber } from '../src/fiber.js'

// Starts are queued as microtasks; one sleep(0) lets them run.
async function tick(): Promise<void> {
  await Bun.sleep(0)
}

// Drains every fiber's transition queue, twice, because settling one fiber can
// enqueue work on another (a provide starting a dependent).
async function settleAll(fibers: Fiber[]): Promise<void> {
  for (let round = 0; round < 2; round++) {
    for (const fiber of fibers) {
      await fiber.settle()
    }
  }
}

describe('mount and load', () => {
  test('a plugin with no requirements loads immediately and receives its config', async () => {
    const kernel = new Kernel()
    const seen: string[] = []
    const plugin: Plugin<{ greeting: string }> = {
      name: 'greeter',
      apply(_context, config) {
        seen.push(config.greeting)
      },
    }

    const fiber = kernel.mount(plugin, { greeting: 'hello' })
    await fiber.settle()

    expect(fiber.state).toBe('active')
    expect(seen).toEqual(['hello'])
  })

  test('a plugin waits in pending until its injected service is provided', async () => {
    const kernel = new Kernel()
    const events: string[] = []
    const consumer: Plugin = {
      name: 'consumer',
      inject: ['thing'],
      apply(context) {
        events.push(`loaded with ${String(context.get('thing'))}`)
      },
    }

    const consumerFiber = kernel.mount(consumer)
    await tick()
    expect(consumerFiber.state).toBe('pending')

    const provider: Plugin = {
      name: 'provider',
      apply(context) {
        context.provide('thing', 42)
      },
    }
    const providerFiber = kernel.mount(provider)
    await settleAll([providerFiber, consumerFiber])

    expect(consumerFiber.state).toBe('active')
    expect(events).toEqual(['loaded with 42'])
  })
})

describe('effect disposal', () => {
  test('disposers run in reverse registration order, children in their slot', async () => {
    const kernel = new Kernel()
    const events: string[] = []
    const child: Plugin = {
      name: 'child',
      apply(context) {
        context.effect(() => () => { events.push('child down') })
      },
    }
    const parent: Plugin = {
      name: 'parent',
      apply(context) {
        context.effect(() => () => { events.push('effect-A down') })
        context.plugin(child)
        context.effect(() => () => { events.push('effect-B down') })
      },
    }

    const fiber = kernel.mount(parent)
    await fiber.settle()
    await tick()
    await fiber.dispose()

    expect(events).toEqual(['effect-B down', 'child down', 'effect-A down'])
  })

  test('dispose awaits asynchronous disposers before resolving', async () => {
    const kernel = new Kernel()
    const events: string[] = []
    const plugin: Plugin = {
      name: 'slow-cleanup',
      apply(context) {
        context.effect(() => async () => {
          await Bun.sleep(5)
          events.push('slow disposer finished')
        })
      },
    }

    const fiber = kernel.mount(plugin)
    await fiber.settle()
    await fiber.dispose()

    expect(events).toEqual(['slow disposer finished'])
    expect(fiber.state).toBe('disposed')
  })
})

describe('reactive dependencies', () => {
  function makeChain(kernel: Kernel, events: string[]) {
    const providerA: Plugin = {
      name: 'a',
      apply(context) {
        context.effect(() => () => { events.push('A down') })
        context.provide('a', 'service-a')
      },
    }
    const middleB: Plugin = {
      name: 'b',
      inject: ['a'],
      apply(context) {
        events.push('B up')
        context.effect(() => () => { events.push('B down') })
        context.provide('b', 'service-b')
      },
    }
    const consumerC: Plugin = {
      name: 'c',
      inject: ['b'],
      apply(context) {
        events.push('C up')
        context.effect(() => () => { events.push('C down') })
      },
    }
    const a = kernel.mount(providerA)
    const b = kernel.mount(middleB)
    const c = kernel.mount(consumerC)
    return { a, b, c }
  }

  test('withdrawing a service unloads dependents transitively, deepest first', async () => {
    const kernel = new Kernel()
    const events: string[] = []
    const { a, b, c } = makeChain(kernel, events)
    await settleAll([a, b, c])
    expect(c.state).toBe('active')

    await a.dispose()

    expect(events).toEqual(['B up', 'C up', 'C down', 'B down', 'A down'])
    expect(b.state).toBe('pending')
    expect(c.state).toBe('pending')
  })

  test('a dependent unloaded by service loss reloads when the provider returns', async () => {
    const kernel = new Kernel()
    const events: string[] = []
    const { a, b, c } = makeChain(kernel, events)
    await settleAll([a, b, c])

    await a.stop()
    expect(b.state).toBe('pending')
    expect(c.state).toBe('pending')

    await a.start()
    await settleAll([a, b, c])

    expect(b.state).toBe('active')
    expect(c.state).toBe('active')
    expect(events).toEqual(['B up', 'C up', 'C down', 'B down', 'A down', 'B up', 'C up'])
  })
})

describe('disposal races', () => {
  test('a detached continuation cannot register an effect after disposal', async () => {
    const kernel = new Kernel()
    let releaseDetached: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      releaseDetached = resolve
    })
    let resourceCreated = false
    let detachedError: unknown
    const plugin: Plugin = {
      name: 'leaky',
      apply(context) {
        void (async () => {
          await gate
          try {
            context.effect(() => {
              resourceCreated = true
              return () => {}
            })
          } catch (error) {
            detachedError = error
          }
        })()
      },
    }

    const fiber = kernel.mount(plugin)
    await fiber.settle()
    await fiber.dispose()
    releaseDetached()
    await tick()

    expect(detachedError).toBeInstanceOf(Error)
    expect(resourceCreated).toBe(false)
  })

  test('dispose requested during loading waits for apply to settle', async () => {
    const kernel = new Kernel()
    const events: string[] = []
    let releaseApply: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      releaseApply = resolve
    })
    const plugin: Plugin = {
      name: 'slow-load',
      async apply(context) {
        context.effect(() => () => { events.push('disposed') })
        await gate
        events.push('apply finished')
      },
    }

    const fiber = kernel.mount(plugin)
    await tick()
    expect(fiber.state).toBe('loading')

    const disposal = fiber.dispose()
    releaseApply()
    await disposal

    expect(events).toEqual(['apply finished', 'disposed'])
    expect(fiber.state).toBe('disposed')
  })

  test('every context operation throws on a disposed context', async () => {
    const kernel = new Kernel()
    let saved: Context | undefined
    const fiber = kernel.mount({
      name: 'holder',
      apply(context) {
        saved = context
      },
    })
    await fiber.settle()
    await fiber.dispose()

    const context = saved as Context
    expect(() => context.get('anything')).toThrow('disposed')
    expect(() => context.effect(() => () => {})).toThrow('disposed')
    expect(() => context.provide('name', 1)).toThrow('disposed')
    expect(() => context.plugin({ apply() {} })).toThrow('disposed')
  })
})

describe('failure', () => {
  test('a throwing apply reverts its partial effects and marks the fiber failed', async () => {
    const kernel = new Kernel()
    const events: string[] = []
    const plugin: Plugin = {
      name: 'broken',
      apply(context) {
        context.effect(() => () => { events.push('partial effect reverted') })
        throw new Error('boom')
      },
    }

    const fiber = kernel.mount(plugin)
    await fiber.settle()

    expect(fiber.state).toBe('failed')
    expect(events).toEqual(['partial effect reverted'])
  })

  test('providing an already-taken service name fails the second plugin', async () => {
    const kernel = new Kernel()
    const first = kernel.mount({
      name: 'first',
      apply(context) {
        context.provide('clock', 1)
      },
    })
    const second = kernel.mount({
      name: 'second',
      apply(context) {
        context.provide('clock', 2)
      },
    })
    await settleAll([first, second])

    expect(first.state).toBe('active')
    expect(second.state).toBe('failed')
    expect(kernel.getService('clock')).toBe(1)
  })
})

describe('kernel teardown', () => {
  test('kernel.dispose tears down every mounted plugin', async () => {
    const kernel = new Kernel()
    const events: string[] = []
    const one = kernel.mount({
      name: 'one',
      apply(context) {
        context.effect(() => () => { events.push('one down') })
      },
    })
    const two = kernel.mount({
      name: 'two',
      apply(context) {
        context.effect(() => () => { events.push('two down') })
      },
    })
    await settleAll([one, two])

    await kernel.dispose()

    expect(events).toEqual(['two down', 'one down'])
    expect(one.state).toBe('disposed')
    expect(two.state).toBe('disposed')
  })
})
