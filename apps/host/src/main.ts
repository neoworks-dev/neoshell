import { homedir, userInfo } from 'node:os'
import { join } from 'node:path'
import { Kernel } from '@neoshell/kernel'
import { assetsPlugin } from './plugins/assets.js'
import { busPlugin } from './plugins/bus.js'
import { configPlugin } from './plugins/config.js'
import { extensionsPlugin } from './plugins/extensions.js'
import { httpPlugin } from './plugins/http.js'
import { renderHostPlugin } from './plugins/renderHost.js'
import { surfacePagePlugin } from './plugins/surfacePage.js'
import { surfacesPlugin } from './plugins/surfaces.js'
import { unixSocketPlugin } from './plugins/unixSocket.js'
import { viewTreePlugin } from './plugins/viewTree.js'

// neoshell-host: the kernel root. Mounts the built-in runtime plugins — bus,
// config, transports, render host — and nothing feature-shaped. Runs alongside
// the Go core during migration, on its own port and socket.

function main(): void {
  const kernel = new Kernel()
  const extensionsDir = envString('NEOSHELL_EXTENSIONS', 'apps/extensions')
  kernel.mount(busPlugin)
  kernel.mount(configPlugin, { path: defaultConfigPath() })
  kernel.mount(unixSocketPlugin, { socketPath: join(runtimeDir(), 'neoshell-host.sock') })
  kernel.mount(httpPlugin, {
    port: envNumber('NEOSHELL_HOST_PORT', 9877),
    // Extension bundles are the plugin dirs: /plugins/<id>/ serves <ext>/dist.
    pluginsDir: envString('NEOSHELL_PLUGINS', extensionsDir),
  })
  kernel.mount(assetsPlugin)
  kernel.mount(surfacePagePlugin)
  kernel.mount(surfacesPlugin)
  kernel.mount(extensionsPlugin, { extensionsDir })
  kernel.mount(viewTreePlugin, { extensionsDir })
  mountRenderHostIfEnabled(kernel)
  installSignalHandlers(kernel)
  console.log('neoshell-host running')
}

// The host owns the render host by default; NEOSHELL_HOST_RENDER=0 runs
// headless (tests, remote development).
function mountRenderHostIfEnabled(kernel: Kernel): void {
  if (process.env.NEOSHELL_HOST_RENDER === '0') {
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
