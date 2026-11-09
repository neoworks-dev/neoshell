import GLib from 'gi://GLib'
import type { Plugin } from '@neoworks/extension-system'
import { requireService } from '../../lib/services.js'
import { registerFunction } from '../../lib/bus.js'
import type { BusService } from '../../lib/bus.js'
import { thumbnailHandle } from '../../host/paintables.js'

// What the Control Centre needs from the machine, which its view, running as
// a client, cannot read itself:
//
//   quicksettings.account   {realName, accountLabel, avatar, canScreenshot}
//                           avatar is a picture handle for ~/.face, or ''
//
//   quicksettings:screenshot  {}  → {ok} | {error}   grim on a slurp selection

const AVATAR_PIXELS = 88
const SCREENSHOT_COMMAND = 'grim -g "$(slurp)"'
const COMMAND_TIMEOUT_MS = 5000

const plugin: Plugin.Object = {
  name: 'quicksettings',
  inject: ['bus'],
  apply(context) {
    const bus = requireService<BusService>(context, 'bus')
    context.effect(() => bus.retain('quicksettings.account', accountOf()))
    registerFunction(context, bus, 'quicksettings:screenshot', () =>
      bus.call('hypr:dispatch', { dispatcher: 'exec', arg: SCREENSHOT_COMMAND }, COMMAND_TIMEOUT_MS),
    )
  },
}

export default plugin

function accountOf(): Record<string, unknown> {
  const userName = GLib.get_user_name()
  return {
    realName: displayNameOf(GLib.get_real_name(), userName),
    accountLabel: `${userName}@${GLib.get_host_name()}`,
    avatar: avatarHandle(),
    canScreenshot: hasPrograms(['grim', 'slurp']),
  }
}

function avatarHandle(): string {
  const path = GLib.build_filenamev([GLib.get_home_dir(), '.face'])
  if (!GLib.file_test(path, GLib.FileTest.EXISTS)) {
    return ''
  }
  return thumbnailHandle(path, AVATAR_PIXELS)
}

function displayNameOf(realName: string, userName: string): string {
  if (realName === '' || realName === 'Unknown') {
    return userName
  }
  return realName
}

function hasPrograms(names: string[]): boolean {
  return names.every((name) => GLib.find_program_in_path(name) !== null)
}
