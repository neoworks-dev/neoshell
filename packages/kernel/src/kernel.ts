import { Fiber } from './fiber.js'
import type { EffectDisposer, Plugin } from './types.js'

interface ServiceEntry {
  value: unknown
  owner: Fiber
}

// Kernel is the root of the plugin tree: a flat service registry plus the set
// of live fibers. It owns no feature code — plugins provide services, other
// plugins inject them, and the kernel decides who may load when.
export class Kernel {
  readonly root: Fiber
  private readonly services = new Map<string, ServiceEntry>()
  private readonly fibers = new Set<Fiber>()

  constructor() {
    this.root = Fiber.createRoot(this)
  }

  // mount adds a top-level plugin. It loads as soon as its injected services
  // exist — immediately, or later when a provider appears.
  mount<Config>(plugin: Plugin<Config>, config?: Config): Fiber {
    return this.root.context.plugin(plugin, config)
  }

  // dispose tears down the whole tree: every mounted plugin, transitively.
  async dispose(): Promise<void> {
    await this.root.dispose()
  }

  getService(name: string): unknown {
    const entry = this.services.get(name)
    if (entry === undefined) {
      return undefined
    }
    return entry.value
  }

  hasService(name: string): boolean {
    return this.services.has(name)
  }

  // registerService publishes a service and returns the disposer that
  // withdraws it. Withdrawal stops every dependent fiber first, so no plugin
  // ever observes an injected service disappearing mid-flight.
  registerService(name: string, value: unknown, owner: Fiber): EffectDisposer {
    if (this.services.has(name)) {
      throw new Error(`kernel: service "${name}" is already provided`)
    }
    this.services.set(name, { value, owner })
    return async () => {
      await this.stopDependents(name)
      this.services.delete(name)
    }
  }

  registerFiber(fiber: Fiber): void {
    this.fibers.add(fiber)
  }

  removeFiber(fiber: Fiber): void {
    this.fibers.delete(fiber)
  }

  requirementsSatisfied(fiber: Fiber): boolean {
    for (const name of fiber.injected) {
      if (!this.services.has(name)) {
        return false
      }
    }
    return true
  }

  // resolvePending starts every waiting fiber whose requirements are now met.
  // Called after each service registration; starts are queued per fiber, so
  // this never blocks the caller.
  resolvePending(): void {
    for (const fiber of this.fibers) {
      this.startIfReady(fiber)
    }
  }

  private startIfReady(fiber: Fiber): void {
    if (fiber.state !== 'pending') {
      return
    }
    if (!this.requirementsSatisfied(fiber)) {
      return
    }
    void fiber.start()
  }

  private async stopDependents(name: string): Promise<void> {
    for (const fiber of this.fibers) {
      await this.stopIfDependent(fiber, name)
    }
  }

  private async stopIfDependent(fiber: Fiber, name: string): Promise<void> {
    if (!fiber.injected.includes(name)) {
      return
    }
    if (fiber.state !== 'active' && fiber.state !== 'loading') {
      return
    }
    await fiber.stop()
  }
}
