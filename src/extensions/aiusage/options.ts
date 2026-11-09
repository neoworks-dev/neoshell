import { numberOf, recordOf, stringOf } from '../../lib/record.js'

// The "aiusage" section of the config.
//
//   "aiusage": {"agents": {"claude": true, "codex": true},
//               "claudeLimit": 0, "claudeDir": "", "codexDir": ""}
//
// claudeLimit is the fresh tokens a five-hour window counts as full; 0 uses
// the busiest window of the last two days. The directories default to where
// the agents keep their logs.

export interface AiUsageOptions {
  claude: boolean
  codex: boolean
  claudeLimit: number
  claudeDir: string
  codexDir: string
}

export const DEFAULT_CLAUDE_SUBPATH = '.claude/projects'
export const DEFAULT_CODEX_SUBPATH = '.codex/sessions'

export function optionsOf(section: Record<string, unknown>): AiUsageOptions {
  const agents = recordOf(section.agents)
  return {
    claude: flagOf(agents.claude),
    codex: flagOf(agents.codex),
    claudeLimit: Math.max(0, Math.round(numberOf(section.claudeLimit, 0))),
    claudeDir: stringOf(section.claudeDir).trim(),
    codexDir: stringOf(section.codexDir).trim(),
  }
}

function flagOf(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value
  }
  return true
}

/** A configured directory with `~` expanded, or the default under the home directory. */
export function directoryOf(configured: string, home: string, defaultSubpath: string): string {
  if (configured === '') {
    return `${home}/${defaultSubpath}`
  }
  if (configured === '~') {
    return home
  }
  if (configured.startsWith('~/')) {
    return `${home}/${configured.slice(2)}`
  }
  return configured
}
