/** Helpers nhỏ tái dùng. */

export const fmtDate = (d: Date): string => d.toISOString().split('T')[0]

export const initials = (name: string): string =>
  (name || '??')
    .split(/\s+/)
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

export const hashS = (s: string): number =>
  (s || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)

export const sameDay = (a: Date, b: Date): boolean => fmtDate(a) === fmtDate(b)
