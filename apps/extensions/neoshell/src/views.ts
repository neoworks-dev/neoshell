import { mount, unmount } from 'svelte'
import type { Component } from 'svelte'
import type { Plugin } from '@neoshell/kernel'
import Topbar from './Topbar.svelte'
import Clock from './Clock.svelte'
import Battery from './Battery.svelte'
import Volume from './Volume.svelte'
import Dock from './Dock.svelte'
import Wallpaper from './Wallpaper.svelte'
import type { BusLike } from './lib.js'
import './style.css'

// neoshell default views — the neoworks profile's surface set. Each view is a
// Svelte 5 component mounted by a registry factory; the compiled stylesheet
// (Tailwind/DaisyUI, neoworks theme) is injected once per webview document.

interface ViewInstance {
  dispose(): void
  childrenHost?: HTMLElement
}

type ViewFactory = (element: HTMLElement, args: unknown) => ViewInstance

interface ViewRegistryLike {
  register(type: string, factory: ViewFactory): () => void
}

const plugin: Plugin = {
  name: 'neoshell-views',
  inject: ['ui', 'bus'],
  apply(context) {
    const ui = context.require<ViewRegistryLike>('ui')
    const bus = context.require<BusLike>('bus')
    context.effect(() => injectStylesheet())
    context.effect(() => ui.register('neoshell.topbar', topbarFactory(bus)))
    context.effect(() => ui.register('neoshell.clock', svelteFactory(Clock, {})))
    context.effect(() => ui.register('neoshell.battery', svelteFactory(Battery, { bus })))
    context.effect(() => ui.register('neoshell.volume', svelteFactory(Volume, { bus })))
    context.effect(() => ui.register('neoshell.dock', svelteFactory(Dock, { bus })))
    context.effect(() => ui.register('neoshell.wallpaper', svelteFactory(Wallpaper, { bus })))
  },
}

export default plugin

function svelteFactory<Props extends Record<string, unknown>>(
  component: Component<Props>,
  props: Props,
): ViewFactory {
  return (element) => {
    const instance = mount(component, { target: element, props })
    return {
      dispose() {
        void unmount(instance)
      },
    }
  }
}

// The topbar renders its children (clock, battery, …) through the surface
// renderer, which needs a plain element to mount into — created here and
// adopted by the component.
function topbarFactory(bus: BusLike): ViewFactory {
  return (element) => {
    const childrenHost = document.createElement('div')
    childrenHost.className = 'flex shrink-0 items-center gap-4'
    const instance = mount(Topbar, { target: element, props: { bus, childrenHost } })
    return {
      dispose() {
        void unmount(instance)
      },
      childrenHost,
    }
  }
}

function injectStylesheet(): () => void {
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = '/plugins/neoshell/views.css'
  document.head.appendChild(link)
  return () => {
    link.remove()
  }
}
