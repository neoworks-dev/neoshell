import { Context } from './context.js'
import type { Kernel } from './kernel.js'
import type { EffectDisposer, FiberState, Plugin } from './types.js'

// Fiber is one plugin's lifecycle. All state transitions run through a serial
// queue, so a stop requested while apply is still awaiting runs after the load
// settles instead of interleaving with it.
export class Fiber {
  state: FiberState = 'pending'
  readonly context: Context
  readonly injected: string[]

  private readonly kernel: Kernel
  private readonly plugin: Plugin<unknown> | null
  private readonly config: unknown
  private effects: EffectDisposer[] = []
  private queue: Promise<void> = Promise.resolve()

  private constructor(kernel: Kernel, plugin: Plugin<unknown> | null, config: unknown) {
    this.kernel = kernel
    this.plugin = plugin
    this.config = config
    this.injected = injectedNamesOf(plugin)
    this.context = new Context(kernel, this)
  }

  static create(kernel: Kernel, plugin: Plugin<never>, config: unknown): Fiber {
    const fiber = new Fiber(kernel, plugin as Plugin<unknown>, config)
    kernel.registerFiber(fiber)
    return fiber
  }

  // createRoot builds the always-active fiber that owns top-level mounts.
  static createRoot(kernel: Kernel): Fiber {
    const root = new Fiber(kernel, null, undefined)
    root.state = 'active'
    kernel.registerFiber(root)
    return root
  }

  pluginName(): string {
    if (this.plugin === null) {
      return 'root'
    }
    if (this.plugin.name === undefined) {
      return 'anonymous'
    }
    return this.plugin.name
  }

  addEffect(disposer: EffectDisposer): void {
    this.effects.push(disposer)
  }

  // start loads the plugin once its injected services all exist. A start that
  // finds them missing leaves the fiber pending; the kernel retries it on
  // every new service registration.
  start(): Promise<void> {
    return this.enqueue(() => this.runStart())
  }

  // stop unloads back to pending: effects reverted, ready to reload. Used when
  // a required service is withdrawn.
  stop(): Promise<void> {
    return this.enqueue(() => this.runStop())
  }

  // dispose unloads permanently. Resolves only after every disposer,
  // transitively including dependent fibers, has finished.
  dispose(): Promise<void> {
    return this.enqueue(() => this.runDispose())
  }

  // settle resolves once all currently queued transitions have finished.
  // Useful for tests and for callers of fire-and-forget starts.
  settle(): Promise<void> {
    return this.queue
  }

  private enqueue(operation: () => Promise<void>): Promise<void> {
    const result = this.queue.then(operation)
    this.queue = result.catch(ignoreError)
    return result
  }

  private async runStart(): Promise<void> {
    if (this.state !== 'pending') {
      return
    }
    if (!this.kernel.requirementsSatisfied(this)) {
      return
    }
    this.state = 'loading'
    await this.runApply()
  }

  private async runApply(): Promise<void> {
    if (this.plugin === null) {
      this.state = 'active'
      return
    }
    try {
      await this.plugin.apply(this.context, this.config)
      this.state = 'active'
    } catch (error) {
      await this.failLoad(error)
    }
  }

  // failLoad reverts whatever a throwing apply managed to register. The fiber
  // stays failed until explicitly disposed; it does not auto-retry.
  private async failLoad(error: unknown): Promise<void> {
    this.state = 'unloading'
    await this.teardown()
    this.state = 'failed'
    console.error(`kernel: plugin "${this.pluginName()}" failed to load:`, error)
  }

  private async runStop(): Promise<void> {
    if (this.state !== 'active') {
      return
    }
    this.state = 'unloading'
    await this.teardown()
    this.state = 'pending'
  }

  private async runDispose(): Promise<void> {
    if (this.state === 'disposed') {
      return
    }
    if (this.state === 'active') {
      this.state = 'unloading'
      await this.teardown()
    }
    this.state = 'disposed'
    this.kernel.removeFiber(this)
  }

  // teardown runs every disposer in reverse registration order, awaiting each,
  // continuing past individual failures so one bad disposer cannot leak the
  // rest.
  private async teardown(): Promise<void> {
    const disposers = [...this.effects].reverse()
    this.effects = []
    for (const disposer of disposers) {
      await runDisposerSafely(disposer, this.pluginName())
    }
  }
}

function injectedNamesOf(plugin: Plugin<unknown> | null): string[] {
  if (plugin === null) {
    return []
  }
  if (plugin.inject === undefined) {
    return []
  }
  return plugin.inject
}

async function runDisposerSafely(disposer: EffectDisposer, owner: string): Promise<void> {
  try {
    await disposer()
  } catch (error) {
    console.error(`kernel: disposer of "${owner}" threw:`, error)
  }
}

function ignoreError(): void {}
