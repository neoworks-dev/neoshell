// ViewRegistry is the surface's "ui" service: view plugins register factories
// under namespaced type names ("neoshell.topbar", "vpn.indicator"), and the
// renderer resolves view-tree nodes against it. Registration returns a
// disposer, so a view type vanishes with the plugin that contributed it.

export interface ViewInstance {
  dispose(): void
  // Views with children render them into this element; absent means children
  // render directly into the view's own element.
  childrenHost?: HTMLElement
}

export type ViewFactory = (element: HTMLElement, args: unknown) => ViewInstance

export class ViewRegistry {
  private readonly views = new Map<string, ViewFactory>()

  register(type: string, factory: ViewFactory): () => void {
    if (this.views.has(type)) {
      throw new Error(`ui: view type "${type}" is already registered`)
    }
    this.views.set(type, factory)
    return () => {
      this.views.delete(type)
    }
  }

  resolve(type: string): ViewFactory | undefined {
    return this.views.get(type)
  }
}
