import type { Context } from './context.js'

// Plugin is one mountable unit: it names the services it needs and applies its
// side effects to a context. Everything registered through that context is
// reverted by the kernel when the plugin unloads.
export interface Plugin<Config = unknown> {
  name?: string
  // Service names that must exist before apply runs. When one of them is
  // withdrawn at runtime, the plugin unloads; when it returns, it reloads.
  inject?: string[]
  apply(context: Context, config: Config): void | Promise<void>
}

// EffectDisposer reverts one side effect. Teardown awaits it, so asynchronous
// cleanup is finished before dispose() resolves.
export type EffectDisposer = () => void | Promise<void>

// Fiber lifecycle. `pending` doubles as the waiting-for-services state, both
// before first load and after a required service is withdrawn.
export type FiberState =
  | 'pending'
  | 'loading'
  | 'active'
  | 'unloading'
  | 'disposed'
  | 'failed'
