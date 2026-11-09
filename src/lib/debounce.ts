/**
 * A function that runs `callback` once `delayMs` have passed since it was last
 * called. `cancel` drops a pending run, for when the view goes away.
 */
export interface Debounced {
  (): void
  cancel(): void
}

export function debounced(callback: () => void, delayMs: number): Debounced {
  let timer: ReturnType<typeof setTimeout> | undefined
  const call = (): void => {
    clearTimeout(timer)
    timer = setTimeout(callback, delayMs)
  }
  call.cancel = (): void => {
    clearTimeout(timer)
  }
  return call
}
