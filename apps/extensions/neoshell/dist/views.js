// neoshell default views — the neoworks profile's minimal surface set.
// Plain ES module, mounted into surfaces by the view tree. Interim styling is
// inline; the full design-system pass (@neoshell/ui) replaces these views.

export default {
  name: 'neoshell-views',
  inject: ['ui', 'bus'],
  apply(context) {
    const ui = context.require('ui')
    const bus = context.require('bus')

    context.effect(() => ui.register('neoshell.topbar', (element) => topbar(element, bus)))
    context.effect(() => ui.register('neoshell.clock', clock))
    context.effect(() => ui.register('neoshell.battery', (element) => battery(element, bus)))
    context.effect(() => ui.register('neoshell.dock', (element) => dock(element, bus)))
    context.effect(() => ui.register('neoshell.wallpaper', wallpaper))
  },
}

const BAR_STYLE =
  'display:flex;align-items:center;justify-content:space-between;height:36px;' +
  'padding:0 12px;color:#fff;font:500 13px system-ui;background:rgba(20,20,24,0.42)'

function topbar(element, bus) {
  element.style.cssText = BAR_STYLE
  const left = document.createElement('div')
  const right = document.createElement('div')
  right.style.cssText = 'display:flex;align-items:center;gap:14px'
  element.append(left, right)

  const unsubscribe = bus.subscribe('hypr.activeworkspace', (message) => {
    const workspace = message.data
    if (workspace && workspace.name !== undefined) {
      left.textContent = `workspace ${workspace.name}`
    }
  })
  return {
    dispose() {
      unsubscribe()
    },
    childrenHost: right,
  }
}

function clock(element) {
  element.style.cssText = 'font-variant-numeric:tabular-nums'
  const update = () => {
    element.textContent = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  update()
  const timer = setInterval(update, 1000)
  return {
    dispose() {
      clearInterval(timer)
    },
  }
}

function battery(element, bus) {
  const unsubscribe = bus.subscribe('system.battery', (message) => {
    const state = message.data
    if (state && state.percent !== undefined) {
      let charge = ''
      if (state.charging) {
        charge = '⚡'
      }
      element.textContent = `${charge}${state.percent}%`
    }
  })
  return {
    dispose() {
      unsubscribe()
    },
  }
}

const DOCK_STYLE =
  'display:flex;align-items:center;justify-content:center;gap:10px;height:70px;' +
  'background:rgba(20,20,24,0.42)'

function dock(element, bus) {
  element.style.cssText = DOCK_STYLE
  let disposed = false
  void loadDockApps(element, bus, () => disposed)
  return {
    dispose() {
      disposed = true
    },
  }
}

async function loadDockApps(element, bus, isDisposed) {
  const apps = await bus.call('apps:list', {})
  if (isDisposed() || !Array.isArray(apps)) {
    return
  }
  for (const app of apps.slice(0, 8)) {
    element.appendChild(dockIcon(app, bus))
  }
}

function dockIcon(app, bus) {
  const button = document.createElement('button')
  button.title = app.name
  button.style.cssText =
    'width:52px;height:52px;border:0;border-radius:12px;background:transparent;cursor:pointer'
  const image = document.createElement('img')
  image.src = `/appicon/${encodeURIComponent(app.icon)}?size=64`
  image.style.cssText = 'width:100%;height:100%;object-fit:contain'
  button.appendChild(image)
  button.onclick = () => {
    bus.publish('apps:launch', { command: app.exec })
  }
  return button
}

function wallpaper(element) {
  element.style.cssText = 'position:fixed;inset:0'
  const image = document.createElement('img')
  image.src = '/wallpaper'
  image.style.cssText = 'width:100%;height:100%;object-fit:cover'
  image.onerror = () => {
    element.style.background = '#1a1b26'
    image.remove()
  }
  element.appendChild(image)
  return {
    dispose() {},
  }
}
