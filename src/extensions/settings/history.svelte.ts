// The sections visited in the Settings window, for its back and forward
// buttons. Visiting a section drops anything ahead of the current one, as a
// browser does.

export class History {
  private visited = $state<string[]>([])
  private position = $state(-1)

  get current(): string {
    const id = this.visited[this.position]
    if (id === undefined) {
      return ''
    }
    return id
  }

  get canGoBack(): boolean {
    return this.position > 0
  }

  get canGoForward(): boolean {
    return this.position < this.visited.length - 1
  }

  visit(id: string): void {
    if (id === this.current) {
      return
    }
    this.visited = [...this.visited.slice(0, this.position + 1), id]
    this.position = this.visited.length - 1
  }

  back(): void {
    if (this.canGoBack) {
      this.position -= 1
    }
  }

  forward(): void {
    if (this.canGoForward) {
      this.position += 1
    }
  }
}
