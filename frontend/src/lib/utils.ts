/** Helpers nhỏ tái dùng. */

export const fmtDate = (d: Date): string => {
  // Dùng local date components — KHÔNG dùng toISOString(): nó convert sang UTC nên
  // user ở GMT+7 vào sáng sớm sẽ bị shift sang ngày hôm trước (bug calendar key mismatch).
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

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
