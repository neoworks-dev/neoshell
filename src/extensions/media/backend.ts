import type { Context, Plugin } from '@neoworks/extension-system'
import { requireService } from '../../lib/services.js'
import { RetainedTopics, registerFunction } from '../../lib/bus.js'
import type { BusService } from '../../lib/bus.js'
import { output, run, watchLines } from '../../gjs/proc.js'
import { followArtwork } from './artwork.js'

// media: the current MPRIS track as a retained bus topic, followed through
// playerctl rather than D-Bus directly — the same shape as the system
// extension shelling out to wpctl.
//
//   media.player    {player, status, title, artist, album, artUrl, length, shuffle}
//   media.position  {position}
//   media.artwork   {artUrl, handle}    see artwork.ts
//
//   media:playPause  {}         → {ok} | {error}
//   media:next       {}         → {ok} | {error}
//   media:previous   {}         → {ok} | {error}
//   media:shuffle    {}         → {ok} | {error}
//   media:seek       {seconds}  → {ok} | {error}
//
// Every player is followed, and the one shown is chosen here: a playing one
// with a title first, then whichever titled one changed last. A browser
// often keeps a player "playing" with no metadata at all (a muted video, a
// web app), and playerctl's own default would pick that one — so the
// commands go to the chosen player by name too, never to playerctl's pick.
//
// artUrl is whatever MPRIS reports: file:// for local art, http(s) for
// streamed art, or empty.
//
// length and position are seconds; MPRIS reports microseconds. Only length
// travels with the track, because --follow emits on metadata change and never
// on the playhead moving — position is polled instead, and only while the
// chosen player is actually playing.

export interface TrackState {
  player: string
  status: string
  title: string
  artist: string
  album: string
  artUrl: string
  length: number
  shuffle: boolean
}

interface PlayerEntry {
  track: TrackState
  changedAt: number
}

interface FollowState {
  players: Map<string, PlayerEntry>
  chosen: string
  stopped: boolean
  stopChild: () => void
  restartTimer: number | null
}

// Unit separator: titles and artists contain every printable delimiter.
const FIELD_SEPARATOR = '\u001f'
const TRACK_FORMAT = [
  '{{playerInstance}}',
  '{{status}}',
  '{{xesam:title}}',
  '{{xesam:artist}}',
  '{{xesam:album}}',
  '{{mpris:artUrl}}',
  '{{mpris:length}}',
  '{{shuffle}}',
].join(FIELD_SEPARATOR)
const RESTART_DELAY_MS = 2000
const POSITION_POLL_MS = 1000
// --follow says nothing when a player quits, so the list is re-read.
const PLAYER_LIST_POLL_MS = 5000
const MICROSECONDS_PER_SECOND = 1_000_000

const mediaExtension: Plugin.Object<undefined> = {
  name: 'media',
  inject: ['bus'],
  apply(context) {
    const bus = requireService<BusService>(context, 'bus')
    const retained = new RetainedTopics(bus)
    const state: FollowState = {
      players: new Map(),
      chosen: '',
      stopped: false,
      stopChild: () => {},
      restartTimer: null,
    }
    context.effect(() => followPlayers(retained, state))
    context.effect(() => pollPlayerList(retained, state))
    context.effect(() => pollPosition(retained, state))
    context.effect(() => followArtwork(bus))
    registerCommands(context, bus, state)
  },
}

export default mediaExtension

function registerCommands(context: Context, bus: BusService, state: FollowState): void {
  registerFunction(context, bus, 'media:playPause', () => runPlayerctl(state, ['play-pause']))
  registerFunction(context, bus, 'media:next', () => runPlayerctl(state, ['next']))
  registerFunction(context, bus, 'media:previous', () => runPlayerctl(state, ['previous']))
  registerFunction(context, bus, 'media:shuffle', () => runPlayerctl(state, ['shuffle', 'toggle']))
  registerFunction(context, bus, 'media:seek', (data) => seek(state, data))
}

async function seek(state: FollowState, data: unknown): Promise<unknown> {
  const seconds = (data as Record<string, unknown>).seconds
  if (typeof seconds !== 'number' || Number.isNaN(seconds) || seconds < 0) {
    return { error: 'seconds must be a non-negative number' }
  }
  return runPlayerctl(state, ['position', String(Math.round(seconds))])
}

async function runPlayerctl(state: FollowState, argv: string[]): Promise<unknown> {
  if (state.chosen === '') {
    return { error: 'no player' }
  }
  const result = await run(['playerctl', '--player', state.chosen, ...argv])
  if (result.ok) {
    return { ok: true }
  }
  if (result.stderr === '') {
    return { error: `playerctl ${argv[0]} failed` }
  }
  return { error: result.stderr }
}

// playerctl --follow exits once the last player goes away, so the follow is
// restarted on a delay and an empty track is published in the meantime —
// otherwise a view would keep showing whatever was playing when the player
// quit.
function followPlayers(retained: RetainedTopics, state: FollowState): () => void {
  startFollow(retained, state)
  return () => {
    state.stopped = true
    state.stopChild()
    cancelRestart(state)
    state.players.clear()
    state.chosen = ''
    retained.withdrawAll()
  }
}

function startFollow(retained: RetainedTopics, state: FollowState): void {
  if (state.stopped) {
    return
  }
  state.stopChild = watchLines(
    ['playerctl', '--all-players', 'metadata', '--follow', '--format', TRACK_FORMAT],
    (line) => recordTrack(retained, state, trackOf(line)),
    () => {
      state.players.clear()
      publishChosen(retained, state)
      scheduleRestart(retained, state)
    },
  )
}

function recordTrack(retained: RetainedTopics, state: FollowState, track: TrackState): void {
  if (track.player === '') {
    return
  }
  state.players.set(track.player, { track, changedAt: Date.now() })
  publishChosen(retained, state)
}

function publishChosen(retained: RetainedTopics, state: FollowState): void {
  const chosen = chosenTrack(state.players)
  state.chosen = chosen.player
  retained.set('media.player', chosen)
}

export function chosenTrack(players: Map<string, PlayerEntry>): TrackState {
  const titled = [...players.values()]
    .filter((entry) => entry.track.title !== '')
    .sort((first, second) => second.changedAt - first.changedAt)
  const playing = titled.find((entry) => entry.track.status === 'Playing')
  if (playing !== undefined) {
    return playing.track
  }
  if (titled.length > 0) {
    return titled[0].track
  }
  return emptyTrack()
}

function pollPlayerList(retained: RetainedTopics, state: FollowState): () => void {
  const timer = setInterval(() => void pruneGonePlayers(retained, state), PLAYER_LIST_POLL_MS)
  return () => clearInterval(timer)
}

async function pruneGonePlayers(retained: RetainedTopics, state: FollowState): Promise<void> {
  const present = new Set((await output(['playerctl', '--list-all'])).split('\n').map((line) => line.trim()))
  const gone = [...state.players.keys()].filter((player) => !present.has(player))
  if (gone.length === 0) {
    return
  }
  gone.forEach((player) => state.players.delete(player))
  publishChosen(retained, state)
}

function scheduleRestart(retained: RetainedTopics, state: FollowState): void {
  if (state.stopped || state.restartTimer !== null) {
    return
  }
  state.restartTimer = setTimeout(() => {
    state.restartTimer = null
    startFollow(retained, state)
  }, RESTART_DELAY_MS)
}

function cancelRestart(state: FollowState): void {
  if (state.restartTimer === null) {
    return
  }
  clearTimeout(state.restartTimer)
  state.restartTimer = null
}

function emptyTrack(): TrackState {
  return { player: '', status: '', title: '', artist: '', album: '', artUrl: '', length: 0, shuffle: false }
}

function pollPosition(retained: RetainedTopics, state: FollowState): () => void {
  const timer = setInterval(() => void publishPosition(retained, state), POSITION_POLL_MS)
  return () => clearInterval(timer)
}

async function publishPosition(retained: RetainedTopics, state: FollowState): Promise<void> {
  const entry = state.players.get(state.chosen)
  if (entry === undefined || entry.track.status !== 'Playing') {
    return
  }
  const seconds = Number.parseFloat(await output(['playerctl', '--player', state.chosen, 'position']))
  if (Number.isNaN(seconds)) {
    return
  }
  retained.set('media.position', { position: seconds })
}

export function trackOf(line: string): TrackState {
  const fields = line.split(FIELD_SEPARATOR)
  return {
    player: fieldAt(fields, 0),
    status: fieldAt(fields, 1),
    title: fieldAt(fields, 2),
    artist: fieldAt(fields, 3),
    album: fieldAt(fields, 4),
    artUrl: fieldAt(fields, 5),
    length: secondsOf(fieldAt(fields, 6)),
    shuffle: fieldAt(fields, 7) === 'true',
  }
}

function fieldAt(fields: string[], index: number): string {
  if (index >= fields.length) {
    return ''
  }
  return fields[index].trim()
}

// A player with no track, or one streaming something unbounded, reports an
// empty or unparseable length; 0 reads as "no duration" to views.
function secondsOf(microseconds: string): number {
  const parsed = Number.parseInt(microseconds, 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    return 0
  }
  return parsed / MICROSECONDS_PER_SECOND
}
