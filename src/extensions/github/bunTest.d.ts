// The slice of bun:test the unit tests use; the project's tsconfig carries no
// bun types.
declare module 'bun:test' {
  interface Matchers {
    toBe(expected: unknown): void
    toEqual(expected: unknown): void
    toBeNull(): void
    toBeGreaterThan(expected: number): void
  }
  export function describe(name: string, body: () => void): void
  export function test(name: string, body: () => void): void
  export function expect(actual: unknown): Matchers
}
