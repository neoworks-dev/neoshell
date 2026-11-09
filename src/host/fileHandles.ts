import GLib from 'gi://GLib'

// Files a client may hand to a drag or name in a call, as handles the way
// paintables are: a host backend registers a path and publishes the handle,
// a client puts it on `drag-files={[handle]}` or sends it back, and the host
// swaps it for the path. A client can only ever name a file it was given.

const pathsByHandle = new Map<string, string>()
const handlesByPath = new Map<string, string>()

/** The handle for `path`; the same one each time it is asked for. */
export function registerFile(path: string): string {
  const known = handlesByPath.get(path)
  if (known !== undefined) {
    return known
  }
  const handle = `file:${GLib.uuid_string_random()}`
  pathsByHandle.set(handle, path)
  handlesByPath.set(path, handle)
  return handle
}

export function releaseFile(path: string): void {
  const handle = handlesByPath.get(path)
  if (handle === undefined) {
    return
  }
  handlesByPath.delete(path)
  pathsByHandle.delete(handle)
}

export function pathOfFile(handle: unknown): string | null {
  if (typeof handle !== 'string') {
    return null
  }
  const path = pathsByHandle.get(handle)
  if (path === undefined) {
    return null
  }
  return path
}

/** The paths behind the handles the host knows, in order. */
export function filesOf(handles: string[]): string[] {
  return handles.flatMap((handle) => {
    const path = pathOfFile(handle)
    if (path === null) {
      return []
    }
    return [path]
  })
}
