import { describe, expect, test } from 'bun:test'
import { attentionOf, cpuFractionOf, engineLineOf, sublineOf, stoppedLineOf, upCountOf } from './display.js'
import { failureOf } from './failure.js'
import { isAction, isEngineContainerId, isPodId, kubePodsArgs, optionsOf } from './options.js'
import {
  NO_READING,
  countsOf,
  dockerStateOf,
  parseDockerPs,
  parseDockerStats,
  parseKubePods,
  parsePodmanPs,
  parsePodmanStats,
  publishedPortsOf,
  sortedItems,
  toneOf,
  visibleItems,
  withUsage,
} from './parse.js'
import type { ContainerItem } from './parse.js'
import { allEnginesDown, containersStateOf } from './topic.js'

const COMPOSE_LABELS = 'com.docker.compose.container-number=1,com.docker.compose.project=continuum,com.docker.compose.service=web'

function dockerLine(fields: Record<string, string>): string {
  return JSON.stringify({
    ID: 'abc123def456',
    Names: 'web-1',
    Image: 'nginx:1.27',
    State: 'running',
    Status: 'Up 3 hours',
    HealthStatus: 'none',
    Ports: '',
    Labels: '',
    ...fields,
  })
}

describe('docker ps', () => {
  test('a line becomes an item with its compose project', () => {
    const [item] = parseDockerPs(dockerLine({ Labels: COMPOSE_LABELS }), 'docker')
    expect(item.id).toBe('abc123def456')
    expect(item.name).toBe('web-1')
    expect(item.group).toBe('continuum')
    expect(item.state).toBe('running')
    expect(item.controllable).toBe(true)
    expect(item.cpu).toBe(NO_READING)
  })

  test('garbage lines are dropped, the rest kept', () => {
    const text = `${dockerLine({})}\nnot json\n\n{"x":1}\n${dockerLine({ ID: 'ffff00001111', Names: 'db-1' })}`
    expect(parseDockerPs(text, 'docker').map((item) => item.name)).toEqual(['web-1', 'db-1'])
  })

  test('health comes from the field, then from the status text', () => {
    const [byField] = parseDockerPs(dockerLine({ HealthStatus: 'unhealthy' }), 'docker')
    const [byStatus] = parseDockerPs(dockerLine({ HealthStatus: '', Status: 'Up 2 minutes (health: starting)' }), 'docker')
    expect(byField.state).toBe('unhealthy')
    expect(byStatus.state).toBe('starting')
  })

  test('exit codes tell a stop from a crash', () => {
    expect(dockerStateOf('exited', 'none', 'Exited (0) 2 days ago')).toBe('stopped')
    expect(dockerStateOf('exited', 'none', 'Exited (143) 2 days ago')).toBe('stopped')
    expect(dockerStateOf('exited', 'none', 'Exited (127) 3 months ago')).toBe('failed')
    expect(dockerStateOf('exited', 'none', 'Exited')).toBe('stopped')
  })

  test('the other states', () => {
    expect(dockerStateOf('restarting', 'none', '')).toBe('starting')
    expect(dockerStateOf('paused', 'none', '')).toBe('paused')
    expect(dockerStateOf('created', 'none', 'Created')).toBe('stopped')
    expect(dockerStateOf('dead', 'none', '')).toBe('failed')
    expect(dockerStateOf('running', 'healthy', '')).toBe('running')
  })

  test('published ports are listed once, without the IPv6 twin', () => {
    expect(publishedPortsOf('0.0.0.0:8080->80/tcp, [::]:8080->80/tcp, 3306/tcp')).toBe(':8080')
    expect(publishedPortsOf('0.0.0.0:8000-8001->8000-8001/tcp')).toBe(':8000')
    expect(publishedPortsOf('3306/tcp')).toBe('')
  })
})

describe('podman', () => {
  test('ps json is an array with names as a list', () => {
    const text = JSON.stringify([
      {
        Id: '0123456789abcdef0123',
        Names: ['cache'],
        Image: 'redis',
        State: 'running',
        Status: 'Up 5 minutes (healthy)',
        Labels: { 'com.docker.compose.project': 'shop' },
        Ports: [{ host_port: 6379 }, { host_port: 6379 }],
      },
      { Id: 'ffffffffffffeeee', Names: ['old'], Image: 'x', State: 'exited', ExitCode: 3 },
    ])
    const [cache, old] = parsePodmanPs(text)
    expect(cache.id).toBe('0123456789ab')
    expect(cache.group).toBe('shop')
    expect(cache.ports).toBe(':6379')
    expect(cache.state).toBe('running')
    expect(old.state).toBe('failed')
    expect(old.detail).toBe('Exited (3)')
  })

  test('not json is no containers', () => {
    expect(parsePodmanPs('boom')).toEqual([])
  })
})

describe('usage', () => {
  test('docker stats are matched by id or name and skip stopped containers', () => {
    const items = parseDockerPs(
      [
        dockerLine({}),
        dockerLine({ ID: 'ffff00001111', Names: 'db-1', State: 'exited', Status: 'Exited (0) 1 hour ago' }),
      ].join('\n'),
      'docker',
    )
    const readings = parseDockerStats(
      [
        JSON.stringify({ ID: 'abc123def456', Name: 'web-1', CPUPerc: '12.50%', MemUsage: '128MiB / 31GiB' }),
        JSON.stringify({ ID: 'ffff00001111', Name: 'db-1', CPUPerc: '0.00%', MemUsage: '0B / 0B' }),
      ].join('\n'),
    )
    const [web, db] = withUsage(items, readings)
    expect(web.cpu).toBe(12.5)
    expect(web.memory).toBe('128MiB')
    expect(db.cpu).toBe(NO_READING)
  })

  test('a dash for the percentage is no reading', () => {
    const readings = parseDockerStats(JSON.stringify({ ID: 'a', Name: 'b', CPUPerc: '--', MemUsage: '-- / --' }))
    expect(readings.get('a')?.cpu).toBe(NO_READING)
  })

  test('podman stats use snake case', () => {
    const readings = parsePodmanStats(JSON.stringify([{ id: 'abcdefabcdef1234', name: 'cache', cpu_percent: '3.00%', mem_usage: '10MB / 1GB' }]))
    expect(readings.get('abcdefabcdef')?.cpu).toBe(3)
    expect(readings.get('cache')?.memory).toBe('10MB')
  })

  test('cpu fills the meter up to one full core', () => {
    const [item] = parseDockerPs(dockerLine({}), 'docker')
    expect(cpuFractionOf({ ...item, cpu: 50 })).toBe(0.5)
    expect(cpuFractionOf({ ...item, cpu: 250 })).toBe(1)
    expect(cpuFractionOf(item)).toBe(0)
  })
})

function pod(fields: Record<string, unknown>): Record<string, unknown> {
  return {
    metadata: { name: 'api-7d9', namespace: 'shop' },
    spec: { containers: [{ image: 'api:1' }] },
    status: { phase: 'Running', containerStatuses: [{ ready: true, restartCount: 0, state: { running: {} } }] },
    ...fields,
  }
}

describe('kubernetes pods', () => {
  function parse(...pods: Record<string, unknown>[]): ContainerItem[] {
    return parseKubePods(JSON.stringify({ items: pods }))
  }

  test('a ready pod is running and read-only', () => {
    const [item] = parse(pod({}))
    expect(item.id).toBe('shop/api-7d9')
    expect(item.engine).toBe('kubernetes')
    expect(item.state).toBe('running')
    expect(item.ready).toBe('1/1')
    expect(item.controllable).toBe(false)
    expect(item.image).toBe('api:1')
  })

  test('a waiting reason shows and fails the pod', () => {
    const [item] = parse(
      pod({
        status: {
          phase: 'Running',
          containerStatuses: [{ ready: false, restartCount: 7, state: { waiting: { reason: 'CrashLoopBackOff' } } }],
        },
      }),
    )
    expect(item.state).toBe('failed')
    expect(item.detail).toBe('CrashLoopBackOff')
    expect(item.restarts).toBe(7)
    expect(sublineOf(item)).toBe('shop · 0/1 · CrashLoopBackOff · 7 restarts')
  })

  test('pending and creating pods are starting', () => {
    const [pending] = parse(pod({ status: { phase: 'Pending' } }))
    const [creating] = parse(
      pod({ status: { phase: 'Pending', containerStatuses: [{ ready: false, state: { waiting: { reason: 'ContainerCreating' } } }] } }),
    )
    expect(pending.state).toBe('starting')
    expect(creating.state).toBe('starting')
    expect(creating.detail).toBe('ContainerCreating')
  })

  test('a pod being deleted is terminating', () => {
    const [item] = parse(pod({ metadata: { name: 'x', namespace: 'n', deletionTimestamp: '2026-01-01T00:00:00Z' } }))
    expect(item.detail).toBe('Terminating')
    expect(item.state).toBe('starting')
  })

  test('completed and failed phases', () => {
    const [done] = parse(pod({ status: { phase: 'Succeeded' } }))
    const [failed] = parse(pod({ status: { phase: 'Failed', reason: 'Evicted' } }))
    expect(done.state).toBe('stopped')
    expect(failed.state).toBe('failed')
  })

  test('running with an unready container is still starting', () => {
    const [item] = parse(
      pod({
        spec: { containers: [{ image: 'a' }, { image: 'b' }] },
        status: {
          phase: 'Running',
          containerStatuses: [
            { ready: true, state: { running: {} } },
            { ready: false, state: { running: {} } },
          ],
        },
      }),
    )
    expect(item.state).toBe('starting')
    expect(item.ready).toBe('1/2')
  })

  test('a pod with no name is dropped, and so is nonsense', () => {
    expect(parse({ metadata: {} })).toEqual([])
    expect(parseKubePods('nope')).toEqual([])
  })
})

describe('ordering and counts', () => {
  const items = parseDockerPs(
    [
      dockerLine({ ID: '1', Names: 'b-run' }),
      dockerLine({ ID: '2', Names: 'a-run' }),
      dockerLine({ ID: '3', Names: 'c-bad', HealthStatus: 'unhealthy' }),
      dockerLine({ ID: '4', Names: 'd-off', State: 'exited', Status: 'Exited (0) 1 day ago' }),
      dockerLine({ ID: '5', Names: 'e-crash', State: 'exited', Status: 'Exited (1) 1 day ago' }),
      dockerLine({ ID: '6', Names: 'f-boot', HealthStatus: 'starting' }),
    ].join('\n'),
    'docker',
  )

  test('attention first, then by name', () => {
    expect(sortedItems(items).map((item) => item.name)).toEqual(['e-crash', 'c-bad', 'f-boot', 'a-run', 'b-run', 'd-off'])
  })

  test('stopped containers can be hidden and are still counted', () => {
    expect(visibleItems(items, false)).toHaveLength(5)
    expect(visibleItems(items, true)).toHaveLength(6)
    const counts = countsOf(items)
    expect(counts).toEqual({ running: 2, starting: 1, unhealthy: 1, failed: 1, paused: 0, stopped: 1, total: 6 })
    expect(upCountOf(counts)).toBe(4)
  })

  test('the card says what needs attention', () => {
    expect(attentionOf(countsOf(items))).toEqual({ text: '2 need attention', tone: 'error' })
    expect(attentionOf({ running: 3, starting: 0, unhealthy: 1, failed: 0, paused: 0, stopped: 0, total: 4 }).text).toBe('1 needs attention')
    expect(attentionOf({ running: 3, starting: 1, unhealthy: 0, failed: 0, paused: 0, stopped: 0, total: 4 }).text).toBe('1 starting')
    expect(attentionOf({ running: 3, starting: 0, unhealthy: 0, failed: 0, paused: 0, stopped: 2, total: 5 }).text).toBe('All healthy')
    expect(attentionOf({ running: 0, starting: 0, unhealthy: 0, failed: 0, paused: 0, stopped: 2, total: 2 }).text).toBe('Nothing running')
    expect(stoppedLineOf(countsOf(items))).toBe('1 stopped')
  })

  test('tones follow state', () => {
    expect(toneOf('running')).toBe('success')
    expect(toneOf('starting')).toBe('warning')
    expect(toneOf('failed')).toBe('error')
    expect(toneOf('stopped')).toBe('neutral')
  })
})

describe('options', () => {
  test('defaults', () => {
    const options = optionsOf({})
    expect(options).toEqual({
      docker: true,
      podman: true,
      kubernetes: true,
      kubeContext: '',
      kubeNamespace: '',
      allNamespaces: false,
      showStopped: false,
      pollSeconds: 10,
    })
  })

  test('engines can be switched off and the poll interval is clamped', () => {
    const options = optionsOf({ engines: { podman: false }, pollSeconds: 1 })
    expect(options.podman).toBe(false)
    expect(options.docker).toBe(true)
    expect(options.pollSeconds).toBe(3)
    expect(optionsOf({ pollSeconds: 99999 }).pollSeconds).toBe(300)
  })

  test('a kube context that is not a name is ignored', () => {
    expect(optionsOf({ kubeContext: '--token=abc' }).kubeContext).toBe('')
    expect(optionsOf({ kubeContext: 'a b' }).kubeContext).toBe('')
    expect(optionsOf({ kubeContext: 'kind-dev' }).kubeContext).toBe('kind-dev')
  })

  test('the kubectl command joins flags to their values', () => {
    expect(kubePodsArgs(optionsOf({}))).toEqual(['kubectl', '--request-timeout=5s', 'get', 'pods', '-o', 'json'])
    expect(kubePodsArgs(optionsOf({ kubeContext: 'kind-dev', kubeNamespace: 'shop' }))).toEqual([
      'kubectl',
      '--context=kind-dev',
      '--request-timeout=5s',
      'get',
      'pods',
      '-o',
      'json',
      '--namespace=shop',
    ])
    expect(kubePodsArgs(optionsOf({ kubeNamespace: 'shop', allNamespaces: true }))).toContain('--all-namespaces')
    expect(kubePodsArgs(optionsOf({ kubeNamespace: 'shop', allNamespaces: true }))).not.toContain('--namespace=shop')
  })

  test('only plain ids and the three actions pass', () => {
    expect(isEngineContainerId('43b3723ce0e9')).toBe(true)
    expect(isEngineContainerId('-rf')).toBe(false)
    expect(isEngineContainerId('a b')).toBe(false)
    expect(isEngineContainerId('a;b')).toBe(false)
    expect(isPodId('shop/api-7d9')).toBe(true)
    expect(isPodId('api')).toBe(false)
    expect(isAction('restart')).toBe(true)
    expect(isAction('rm')).toBe(false)
    expect(isAction(undefined)).toBe(false)
  })
})

describe('failures', () => {
  test('a missing program', () => {
    expect(failureOf('timeout: failed to run command ‘podman’: No such file or directory').kind).toBe('missing')
  })

  test('a daemon that is down or off limits', () => {
    expect(failureOf('Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?').message).toBe(
      'The daemon is not running',
    )
    expect(failureOf('permission denied while trying to connect to the Docker daemon socket').message).toContain('docker group')
  })

  test('a cluster that is down', () => {
    expect(failureOf('E1109 dial tcp 127.0.0.1:40493: connect: connection refused').message).toBe('The cluster is not reachable')
  })

  test('silence is a timeout and long messages are cut', () => {
    expect(failureOf('').message).toBe('Timed out')
    expect(failureOf('x'.repeat(300)).message.length).toBe(120)
  })
})

describe('the topic', () => {
  test('is read defensively', () => {
    const state = containersStateOf({
      items: [
        { id: 'a', engine: 'docker', state: 'running', name: 'web', controllable: true },
        { id: 'b', engine: 'lxc', state: 'running' },
        { id: 'c', engine: 'docker', state: 'asleep' },
        7,
      ],
      counts: { running: 1, total: 1 },
      engines: [{ engine: 'docker', status: 'ok', count: 1 }, { engine: 'nope' }],
    })
    expect(state.items).toHaveLength(1)
    expect(state.items[0].cpu).toBe(NO_READING)
    expect(state.counts.running).toBe(1)
    expect(state.engines).toHaveLength(1)
    expect(containersStateOf(null).items).toEqual([])
  })

  test('engine lines list counts and reasons', () => {
    const line = engineLineOf([
      { engine: 'docker', status: 'ok', message: '', count: 4 },
      { engine: 'podman', status: 'missing', message: 'Not installed', count: 0 },
      { engine: 'kubernetes', status: 'error', message: 'The cluster is not reachable', count: 0 },
    ])
    expect(line).toBe('Docker 4 · Kubernetes: The cluster is not reachable')
  })

  test('engines down means every enabled one is missing or failing', () => {
    expect(
      allEnginesDown([
        { engine: 'docker', status: 'error', message: 'x', count: 0 },
        { engine: 'podman', status: 'missing', message: '', count: 0 },
        { engine: 'kubernetes', status: 'disabled', message: '', count: 0 },
      ]),
    ).toBe(true)
    expect(allEnginesDown([{ engine: 'docker', status: 'ok', message: '', count: 0 }])).toBe(false)
    expect(allEnginesDown([])).toBe(false)
  })
})
