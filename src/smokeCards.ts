import type { Bus } from './host/bus.js'

// The smoke's data for the cards of the Containers, AI usage, Email and
// Gallery extensions. Published onto the smoke's own bus, so nothing here
// reaches a real backend. SmokeCards.svelte draws the cards that read it.

/** [css class of the box a client's card sits in, a label it must have drawn]. */
export const SMOKE_CARD_TEXTS: [string, string][] = [['smoke-remote-containers-card', 'smoke-crash']]

/** [css class of the box, a tooltip it must have drawn]. */
export const SMOKE_CARD_TOOLTIPS: [string, string][] = [['smoke-remote-gallery-card', 'smoke-picture-1.png']]

export function retainSmokeCards(bus: Bus): void {
  retainGallery(bus)
  retainContainers(bus)
}

// One container in every state, from both kinds of engine.
function retainContainers(bus: Bus): void {
  const item = (name: string, state: string, engine: string, extra: Record<string, unknown>): Record<string, unknown> => ({
    id: `id-${name}`,
    engine,
    name,
    group: 'smoke',
    image: 'smoke:latest',
    state,
    detail: state,
    ports: ':8080',
    cpu: -1,
    memory: '',
    restarts: 0,
    ready: '',
    controllable: engine !== 'kubernetes',
    ...extra,
  })
  bus.retain('containers.state', {
    items: [
      item('smoke-crash', 'failed', 'docker', {}),
      item('smoke-sick', 'unhealthy', 'docker', { cpu: 91, memory: '1.2GiB' }),
      item('smoke-boot', 'starting', 'kubernetes', { ready: '0/1', restarts: 2 }),
      item('smoke-up', 'running', 'docker', { cpu: 12.5, memory: '128MiB' }),
      item('smoke-pod', 'running', 'kubernetes', { ready: '1/1' }),
      item('smoke-paused', 'paused', 'podman', {}),
      item('smoke-off', 'stopped', 'docker', {}),
    ],
    counts: { running: 2, starting: 1, unhealthy: 1, failed: 1, paused: 1, stopped: 1, total: 7 },
    engines: [
      { engine: 'docker', status: 'ok', message: '', count: 4 },
      { engine: 'podman', status: 'missing', message: 'Not installed', count: 0 },
      { engine: 'kubernetes', status: 'error', message: 'The cluster is not reachable', count: 0 },
    ],
    updatedAt: Date.now(),
  })
}

function retainGallery(bus: Bus): void {
  bus.retain('gallery.library', {
    folder: '~/Pictures',
    status: 'ok',
    images: Array.from({ length: 12 }, (_, index) => ({
      file: `file:smoke-${index}`,
      name: `smoke-picture-${index + 1}.png`,
    })),
    count: 12,
    intervalSeconds: 6,
    shuffle: false,
    layout: 'mosaic',
    version: 1,
  })
}
