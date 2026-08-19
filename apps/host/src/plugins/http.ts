import { join } from 'node:path'
import type { Server } from 'bun'
import type { Plugin } from '@neoshell/kernel'
import type { Bus } from '../bus.js'
import { WireConnection } from '../wire.js'

export interface HttpConfig {
  // Port to bind on 127.0.0.1; 0 picks a free one (the bound port is exposed
  // on the "http" service).
  port: number
  // Directory of extension bundles; <pluginsDir>/<id>/dist is served at
  // /plugins/<id>/. Unset disables serving.
  pluginsDir?: string
}

export interface HttpService {
  port: number
}

interface WsData {
  connection: WireConnection | null
}

// httpPlugin serves extension bundles over HTTP and exposes the bus to
// webviews over a WebSocket at /ws. Loopback only: the shell's surfaces run on
// this machine, and the bus drives the desktop.
export const httpPlugin: Plugin<HttpConfig> = {
  name: 'http',
  inject: ['bus'],
  apply(context, config) {
    const bus = context.require<Bus>('bus')
    const server = serveHttp(bus, config)
    context.effect(() => () => server.stop(true))
    if (server.port === undefined) {
      throw new Error('http: server bound without a TCP port')
    }
    context.provide('http', { port: server.port } satisfies HttpService)
  },
}

function serveHttp(bus: Bus, config: HttpConfig): Server<WsData> {
  return Bun.serve<WsData>({
    hostname: '127.0.0.1',
    port: config.port,
    fetch(request, server) {
      return routeRequest(request, server, config)
    },
    websocket: {
      open(ws) {
        ws.data.connection = new WireConnection(bus, (line) => {
          ws.send(line)
        })
      },
      message(ws, raw) {
        feedWebSocket(ws.data, raw)
      },
      close(ws) {
        closeWebSocket(ws.data)
      },
    },
  })
}

function routeRequest(
  request: Request,
  server: Server<WsData>,
  config: HttpConfig,
): Response | Promise<Response> | undefined {
  const url = new URL(request.url)
  if (url.pathname === '/ws') {
    return upgradeWebSocket(request, server)
  }
  if (url.pathname.startsWith('/plugins/')) {
    return servePluginFile(url.pathname, config.pluginsDir)
  }
  return new Response('not found', { status: 404 })
}

function upgradeWebSocket(request: Request, server: Server<WsData>): Response | undefined {
  const data: WsData = { connection: null }
  if (server.upgrade(request, { data })) {
    return undefined
  }
  return new Response('websocket upgrade required', { status: 400 })
}

function feedWebSocket(data: WsData, raw: string | Buffer): void {
  if (data.connection === null) {
    return
  }
  // WebSocket frames arrive whole; terminate so the shared NDJSON path fires.
  data.connection.feed(raw.toString() + '\n')
}

function closeWebSocket(data: WsData): void {
  if (data.connection === null) {
    return
  }
  data.connection.close()
  data.connection = null
}

async function servePluginFile(pathname: string, pluginsDir: string | undefined): Promise<Response> {
  if (pluginsDir === undefined) {
    return new Response('plugins disabled', { status: 404 })
  }
  const filePath = resolvePluginPath(pluginsDir, pathname)
  if (filePath === null) {
    return new Response('not found', { status: 404 })
  }
  const file = Bun.file(filePath)
  if (!(await file.exists())) {
    return new Response('not found', { status: 404 })
  }
  return new Response(file)
}

// resolvePluginPath maps /plugins/<id>/<rest> onto <pluginsDir>/<id>/dist/<rest>,
// rejecting ids and paths that could escape the plugins directory.
function resolvePluginPath(pluginsDir: string, pathname: string): string | null {
  const rest = pathname.slice('/plugins/'.length)
  const slashIndex = rest.indexOf('/')
  let id = rest
  let relative = ''
  if (slashIndex >= 0) {
    id = rest.slice(0, slashIndex)
    relative = rest.slice(slashIndex + 1)
  }
  if (id === '' || id.includes('..') || id.includes('\\')) {
    return null
  }
  if (relative === '') {
    relative = 'index.html'
  }
  if (relative.includes('..')) {
    return null
  }
  return join(pluginsDir, id, 'dist', relative)
}
