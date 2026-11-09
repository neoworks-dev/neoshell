// Why an engine command failed, in words for the card.

export interface Failure {
  // missing: the program is not installed. error: it ran and said no.
  kind: 'missing' | 'error'
  message: string
}

const MAX_MESSAGE_LENGTH = 120

/** `stderr` of a command run under `timeout`, which exits quietly when the command took too long. */
export function failureOf(stderr: string): Failure {
  if (stderr.includes('No such file or directory') || stderr.includes('unavailable')) {
    return { kind: 'missing', message: 'Not installed' }
  }
  if (stderr.toLowerCase().includes('permission denied')) {
    return { kind: 'error', message: 'Permission denied. Is your user in the docker group?' }
  }
  if (stderr.includes('Cannot connect to the Docker daemon') || stderr.includes('Cannot connect to Podman')) {
    return { kind: 'error', message: 'The daemon is not running' }
  }
  if (stderr.includes('connection refused') || stderr.includes('Unable to connect to the server')) {
    return { kind: 'error', message: 'The cluster is not reachable' }
  }
  if (stderr.includes('no configuration has been provided') || stderr.includes('context was not found')) {
    return { kind: 'error', message: 'No such kube context' }
  }
  return { kind: 'error', message: firstLineOf(stderr) }
}

function firstLineOf(text: string): string {
  const line = text
    .split('\n')
    .map((candidate) => candidate.trim())
    .find((candidate) => candidate !== '')
  if (line === undefined) {
    return 'Timed out'
  }
  if (line.length > MAX_MESSAGE_LENGTH) {
    return `${line.slice(0, MAX_MESSAGE_LENGTH - 1)}…`
  }
  return line
}
