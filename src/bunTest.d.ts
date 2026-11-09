// The slice of bun:test the unit tests use. The shell is typed against GJS,
// not bun, so bun's own declarations are not installed.
declare module 'bun:test' {
  interface Matchers {
    toBe(expected: unknown): void
    toEqual(expected: unknown): void
    toHaveLength(length: number): void
    toBeNull(): void
    toBeUndefined(): void
    toBeTruthy(): void
    toBeFalsy(): void
    toBeGreaterThan(value: number): void
    toBeLessThan(value: number): void
    toBeGreaterThanOrEqual(value: number): void
    toBeLessThanOrEqual(value: number): void
    toThrow(message?: string): void
    toBeCloseTo(value: number, digits?: number): void
    toContain(item: unknown): void
    toMatch(pattern: RegExp | string): void
    not: Matchers
    rejects: { toThrow(message?: string): Promise<void> }
  }

  export function describe(name: string, body: () => void): void
  export function test(name: string, body: () => void | Promise<void>): void
  export function expect(value: unknown): Matchers
}
