import type { SelectOption } from '@neoworks/gtk-ui'

// The sounds the timer can play at zero: files of the freedesktop sound
// theme, chosen in Settings → Pomodoro as `pomodoro.sound`.

const THEME_DIRECTORY = '/usr/share/sounds/freedesktop/stereo'

export const SILENT = 'none'
export const DEFAULT_SOUND = 'alarm'

interface Sound {
  id: string
  label: string
  file: string
}

const SOUNDS: Sound[] = [
  { id: 'alarm', label: 'Alarm clock', file: 'alarm-clock-elapsed.oga' },
  { id: 'bell', label: 'Bell', file: 'bell.oga' },
  { id: 'complete', label: 'Complete', file: 'complete.oga' },
  { id: 'message', label: 'Message', file: 'message-new-instant.oga' },
  { id: 'attention', label: 'Attention', file: 'window-attention.oga' },
  { id: 'phone', label: 'Phone', file: 'phone-incoming-call.oga' },
]

export const SOUND_OPTIONS: SelectOption[] = [
  { value: SILENT, label: 'None' },
  ...SOUNDS.map((sound) => ({ value: sound.id, label: sound.label })),
]

// The configured sound's id; anything unknown or unset is the default.
export function soundIdOf(value: unknown): string {
  if (value === SILENT) {
    return SILENT
  }
  const found = SOUNDS.find((sound) => sound.id === value)
  if (found === undefined) {
    return DEFAULT_SOUND
  }
  return found.id
}

// The file to play for a sound id, or '' for silence.
export function soundPathOf(id: string): string {
  const found = SOUNDS.find((sound) => sound.id === id)
  if (found === undefined) {
    return ''
  }
  return `${THEME_DIRECTORY}/${found.file}`
}
