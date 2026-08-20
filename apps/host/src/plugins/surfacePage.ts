import type { Plugin } from '@neoshell/kernel'
import type { PageService } from './http.js'

// surfacePagePlugin serves the two routes every webview boots from:
//
//   /surface?surface=<id>   the HTML shell (transparent, no chrome)
//   /runtime.js             the surface runtime, bundled from
//                           @neoshell/surface at host startup via Bun.build
//
// Bundling at startup keeps the repo free of a build step for the runtime —
// the host has the TS sources through its own node_modules.

const SURFACE_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  html, body { margin: 0; height: 100%; background: transparent; overflow: hidden; }
  * { box-sizing: border-box; }
</style>
</head>
<body><script type="module" src="/runtime.js"></script></body>
</html>
`

export const surfacePagePlugin: Plugin = {
  name: 'surface-page',
  async apply(context) {
    const runtimeSource = await bundleSurfaceRuntime()
    context.provide('pages', new SurfacePages(runtimeSource))
  },
}

class SurfacePages implements PageService {
  private readonly runtimeSource: string

  constructor(runtimeSource: string) {
    this.runtimeSource = runtimeSource
  }

  handle(url: URL): Response | null {
    if (url.pathname === '/surface') {
      return new Response(SURFACE_HTML, { headers: { 'Content-Type': 'text/html' } })
    }
    if (url.pathname === '/runtime.js') {
      return new Response(this.runtimeSource, {
        headers: { 'Content-Type': 'text/javascript' },
      })
    }
    return null
  }
}

async function bundleSurfaceRuntime(): Promise<string> {
  // Resolve the package root, then its sibling entry module — subpath
  // patterns through Bun.resolveSync are unreliable across versions.
  const indexPath = Bun.resolveSync('@neoshell/surface', import.meta.dir)
  const entryPath = indexPath.replace(/index\.ts$/, 'entry.ts')
  const result = await Bun.build({
    entrypoints: [entryPath],
    target: 'browser',
  })
  if (!result.success || result.outputs.length === 0) {
    throw new Error(`surface-page: runtime bundle failed: ${result.logs.join('\n')}`)
  }
  return result.outputs[0].text()
}
