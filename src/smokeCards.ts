import type { Bus } from './host/bus.js'

// The smoke's data for the cards of the Containers, AI usage, Email and
// Gallery extensions. Published onto the smoke's own bus, so nothing here
// reaches a real backend. SmokeCards.svelte draws the cards that read it.

/** [css class of the box a client's card sits in, a label it must have drawn]. */
export const SMOKE_CARD_TEXTS: [string, string][] = [
  ['smoke-remote-containers-card', 'smoke-crash'],
  ['smoke-remote-aiusage-card', 'Claude Code'],
]

/** [css class of the box, a tooltip it must have drawn]. */
export const SMOKE_CARD_TOOLTIPS: [string, string][] = [['smoke-remote-gallery-card', 'smoke-picture-1.png']]

export function retainSmokeCards(bus: Bus): void {
  retainGallery(bus)
  retainContainers(bus)
  retainAiUsage(bus)
}

// Both agents, one window past its limit and one without a limit, and one
// session in each state.
function retainAiUsage(bus: Bus): void {
  const today = { tokens: 1_200_000, input: 400, output: 90_000, cacheWrite: 1_100_000, cacheRead: 9_000_000, messages: 80 }
  const resetsAt = Date.now() + 95 * 60_000
  bus.retain('aiusage.state', {
    agents: [
      {
        id: 'claude',
        status: 'ok',
        today,
        window: { label: '5-hour window', percent: 108, tokens: 2_700_000, limit: 2_500_000, resetsAt, active: true, source: 'configured' },
        weekly: null,
        plan: '',
        hourly: [0, 0, 0, 20_000, 0, 180_000, 90_000, 0, 400_000, 120_000, 60_000, 30_000],
      },
      {
        id: 'codex',
        status: 'ok',
        today: { ...today, tokens: 48_000 },
        window: { label: '5-hour window', percent: 31, tokens: 48_000, limit: 0, resetsAt, active: true, source: 'plan' },
        weekly: { label: 'Weekly', percent: 12, tokens: 300_000, limit: 0, resetsAt: resetsAt * 2, active: true, source: 'plan' },
        plan: 'plus',
        hourly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10_000, 30_000],
      },
    ],
    sessions: [
      { id: 's1', agent: 'claude', project: 'smoke', branch: 'main', title: 'Smoke session', model: 'Opus 5.5', what: 'Editing a.ts', status: 'working', lastActivityAt: Date.now(), contextTokens: 143_000 },
      { id: 's2', agent: 'codex', project: 'site', branch: '', title: '', model: 'gpt-6-luna', what: 'Created the files.', status: 'idle', lastActivityAt: Date.now() - 400_000, contextTokens: 0 },
    ],
    scanning: false,
    updatedAt: Date.now(),
  })
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
