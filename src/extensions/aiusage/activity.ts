// What a coding agent is doing, put into one line, and whether it is doing it
// right now.

// none: nothing parsed yet. tool: it called a tool. text: it said something.
// thinking: a response with no text or tool yet. prompt: the user's message.
// tool-result: a tool answered. done: the agent finished its turn.
export type ActivityKind = 'none' | 'tool' | 'text' | 'thinking' | 'prompt' | 'tool-result' | 'done'

export interface Activity {
  time: number
  kind: ActivityKind
  what: string
  // The model's own stop reason for its last response: end_turn, tool_use, …
  stopReason: string
  title: string
  model: string
  cwd: string
  branch: string
  contextTokens: number
}

export type SessionStatus = 'working' | 'idle'

const SNIPPET_LENGTH = 90
const TARGET_LENGTH = 60
const JUST_NOW_MS = 45_000
const TOOL_PATIENCE_MS = 3 * 60_000
const PROMPT_PATIENCE_MS = 5 * 60_000

const VERBS: Record<string, string> = {
  Bash: 'Running',
  Read: 'Reading',
  Edit: 'Editing',
  MultiEdit: 'Editing',
  Write: 'Writing',
  NotebookEdit: 'Editing',
  Grep: 'Searching',
  Glob: 'Finding files',
  WebFetch: 'Fetching',
  WebSearch: 'Searching the web',
  Task: 'Agent',
  Agent: 'Agent',
  TodoWrite: 'Planning',
  Skill: 'Skill',
}

/** The first line of some text, cut to fit a row. */
export function snippetOf(text: string): string {
  return clipped(text.replace(/\s+/g, ' ').trim(), SNIPPET_LENGTH)
}

function clipped(text: string, length: number): string {
  if (text.length <= length) {
    return text
  }
  return `${text.slice(0, length - 1)}…`
}

/** "Editing activity.ts", "Running Show disks and partitions", "Searching the web: neoshell". */
export function describeTool(name: string, input: Record<string, unknown>): string {
  const target = targetOf(input)
  const verb = verbOf(name)
  if (target === '') {
    return verb
  }
  return `${verb} ${target}`
}

function verbOf(name: string): string {
  const known = VERBS[name]
  if (known !== undefined) {
    return known
  }
  if (name.startsWith('mcp__')) {
    return name.split('__').slice(2).join(' ')
  }
  return name
}

// The first of the inputs a person would call "what it is working on".
function targetOf(input: Record<string, unknown>): string {
  const filePath = stringField(input, 'file_path')
  if (filePath !== '') {
    return baseNameOf(filePath)
  }
  for (const field of ['description', 'query', 'url', 'pattern', 'command', 'prompt']) {
    const value = stringField(input, field)
    if (value !== '') {
      return clipped(value.split('\n')[0].trim(), TARGET_LENGTH)
    }
  }
  return ''
}

function baseNameOf(path: string): string {
  const name = path.split('/').pop()
  if (name === undefined || name === '') {
    return path
  }
  return name
}

function stringField(input: Record<string, unknown>, field: string): string {
  const value = input[field]
  if (typeof value === 'string') {
    return value
  }
  return ''
}

/**
 * Working while the log is still moving; a tool call or a prompt gets some
 * patience, since a build can be silent for minutes; a finished turn is idle
 * as soon as it is over.
 */
export function statusOf(activity: Activity, now: number): SessionStatus {
  const age = now - activity.time
  if (activity.kind === 'done' || (activity.kind === 'text' && activity.stopReason === 'end_turn')) {
    return 'idle'
  }
  if (age < JUST_NOW_MS) {
    return 'working'
  }
  if (activity.kind === 'tool' || activity.kind === 'tool-result') {
    return statusWithin(age, TOOL_PATIENCE_MS)
  }
  if (activity.kind === 'prompt' || activity.kind === 'thinking') {
    return statusWithin(age, PROMPT_PATIENCE_MS)
  }
  return 'idle'
}

function statusWithin(age: number, patience: number): SessionStatus {
  if (age < patience) {
    return 'working'
  }
  return 'idle'
}

/** "claude-opus-5-5" → "Opus 5.5"; names it cannot read are shown as they are. */
export function modelLabel(model: string): string {
  const match = /^claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?(?:-\d{8})?$/.exec(model)
  if (match === null) {
    return model
  }
  const family = match[1].charAt(0).toUpperCase() + match[1].slice(1)
  if (match[3] === undefined) {
    return `${family} ${match[2]}`
  }
  return `${family} ${match[2]}.${match[3]}`
}

/** The last path component of a working directory, which is what people call the project. */
export function projectOf(cwd: string): string {
  const parts = cwd.split('/').filter((part) => part !== '')
  if (parts.length === 0) {
    return ''
  }
  return parts[parts.length - 1]
}
