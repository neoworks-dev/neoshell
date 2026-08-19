import { homedir, userInfo } from 'node:os'
import { join } from 'node:path'
import { Kernel } from '@neoshell/kernel'
import { busPlugin } from './plugins/bus.js'
import { configPlugin } from './plugins/config.js'
import { extensionsPlugin } from './plugins/extensions.js'
import { httpPlugin } from './plugins/http.js'
import { renderHostPlugin } from './plugins/renderHost.js'
import { surfacesPlugin } from './plugins/surfaces.js'
import { unixSocketPlugin } from './plugins/unixSocket.js'

// neoshell-host: the kernel root. Mounts the built-in runtime plugins — bus,
// config, transports, render host — and nothing feature-shaped. Runs alongside
// the Go core during migration, on its own port and socket.

function main(): void {
  const kernel = new Kernel()
  kernel.mount(busPlugin)
  kernel.mount(configPlugin, { path: defaultConfigPath() })
  kernel.mount(unixSocketPlugin, { socketPath: join(runtimeDir(), 'neoshell-host.sock') })
  kernel.mount(httpPlugin, {
    port: envNumber('NEOSHELL_HOST_PORT', 9877),
    pluginsDir: process.env.NEOSHELL_PLUGINS,
  })
  kernel.mount(surfacesPlugin)
  kernel.mount(extensionsPlugin, {
    extensionsDir: envString('NEOSHELL_EXTENSIONS', 'apps/extensions'),
  })
  mountRenderHostIfEnabled(kernel)
  installSignalHandlers(kernel)
  console.log('neoshell-host running')
}

// The render host stays with the Go core until migration step 5; opt in with
// NEOSHELL_HOST_RENDER=1 to let this process own it instead.
function mountRenderHostIfEnabled(kernel: Kernel): void {
  if (process.env.NEOSHELL_HOST_RENDER !== '1') {
    return
  }
  kernel.mount(renderHostPlugin, {
    binaryPath: envString('NEOSHELL_RENDER_BIN', 'apps/render-host/neoshell-render'),
    socketPath: join(runtimeDir(), 'neoshell-render.sock'),
  })
}

function installSignalHandlers(kernel: Kernel): void {
  const shutdown = () => {
    void kernel.dispose().then(() => process.exit(0))
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

function defaultConfigPath(): string {
  return join(homedir(), '.config', 'neoshell', 'config.json')
}

function runtimeDir(): string {
  const dir = process.env.XDG_RUNTIME_DIR
  if (dir !== undefined && dir !== '') {
    return dir
  }
  return `/run/user/${userInfo().uid}`
}

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw === '') {
    return fallback
  }
  const value = Number(raw)
  if (Number.isNaN(value)) {
    return fallback
  }
  return value
}

function envString(name: string, fallback: string): string {
  const raw = process.env[name]
  if (raw === undefined || raw === '') {
    return fallback
  }
  return raw
}

main()
