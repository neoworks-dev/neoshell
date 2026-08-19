import { Fiber } from './fiber.js'
import type { Kernel } from './kernel.js'
import type { EffectDisposer, Plugin } from './types.js'

// Context is a plugin's handle on the kernel. Every registration made through
// it is owned by the plugin's fiber and reverted on unload. A context whose
// fiber is no longer loading or active refuses new registrations — that guard
// is what keeps a stale async continuation from leaking effects after
// disposal already ran.
export class Context {
  readonly fiber: Fiber
  private readonly kernel: Kernel

  constructor(kernel: Kernel, fiber: Fiber) {
    this.kernel = kernel
    this.fiber = fiber
  }

  // effect runs setup and registers the disposer it returns. Setup never runs
  // on a dead context, so the guarded resource is never created.
  effect(setup: () => EffectDisposer): void {
    this.assertCanRegister('effect')
    const disposer = setup()
    this.fiber.addEffect(disposer)
  }

  // provide publishes a service under a unique name. Withdrawal (on unload)
  // stops every fiber injecting the name before it disappears.
  provide(name: string, value: unknown): void {
    this.assertCanRegister('provide')
    const withdraw = this.kernel.registerService(name, value, this.fiber)
    this.fiber.addEffect(withdraw)
    this.kernel.resolvePending()
  }

  // get returns a service by name, or undefined. Names listed in the plugin's
  // inject are guaranteed present while it is loading or active.
  get<Value = unknown>(name: string): Value | undefined {
    this.assertNotDisposed('get')
    return this.kernel.getService(name) as Value | undefined
  }

  // require returns a service that must exist — typically one listed in the
  // plugin's inject, where the kernel guarantees presence. Throws instead of
  // returning undefined so callers skip the null check.
  require<Value = unknown>(name: string): Value {
    const value = this.get<Value>(name)
    if (value !== undefined) {
      return value
    }
    throw new Error(`kernel: service "${name}" is not available`)
  }

  // plugin mounts a child fiber. It is disposed with its parent, in reverse
  // registration order relative to the parent's other effects.
  plugin<Config>(plugin: Plugin<Config>, config?: Config): Fiber {
    this.assertCanRegister('plugin')
    const child = Fiber.create(this.kernel, plugin, config)
    this.fiber.addEffect(() => child.dispose())
    void child.start()
    return child
  }

  private assertCanRegister(operation: string): void {
    const state = this.fiber.state
    if (state === 'loading' || state === 'active') {
      return
    }
    throw new Error(
      `kernel: cannot ${operation} on ${state} context of "${this.fiber.pluginName()}"`,
    )
  }

  private assertNotDisposed(operation: string): void {
    if (this.fiber.state !== 'disposed') {
      return
    }
    throw new Error(
      `kernel: cannot ${operation} on disposed context of "${this.fiber.pluginName()}"`,
    )
  }
}
