export function formatDate(iso: string, style: 'long' | 'short' = 'long'): string {
  // Parse as a calendar date so time zones never shift the day.
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: style === 'long' ? 'long' : 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export const yearOf = (iso: string) => iso.slice(0, 4)

/** "48.2" overs → 290 balls */
export function oversToBalls(overs: string): number {
  const [whole, part = '0'] = overs.split('.')
  return Number(whole) * 6 + Number(part)
}

export function ballsToOvers(balls: number): string {
  const o = Math.floor(balls / 6)
  const b = balls % 6
  return b ? `${o}.${b}` : `${o}`
}

export function runRate(runs: number, overs: string): number {
  const balls = oversToBalls(overs)
  return balls ? (runs * 6) / balls : 0
}

export const strikeRate = (runs: number, balls: number) => (balls ? (runs * 100) / balls : 0)

export function clockToSeconds(t: string): number {
  const [m, s] = t.split(':').map(Number)
  return m * 60 + s
}

export function secondsToClock(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

export const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0)

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export const fixed = (n: number, digits = 2) => n.toFixed(digits)

/** "Hugo Arrieta" → "Arrieta" */
export const surname = (name: string) => name.replace(/\s*†\s*$/, '').split(' ').slice(-1)[0]

export const cleanName = (name: string) => name.replace(/\s*†\s*$/, '').trim()

export function minuteLabel(minute: number, added?: number) {
  return added ? `${minute}+${added}'` : `${minute}'`
}

/** "a 92-run" / "an 88-run", "an 11-run" */
export function aOrAn(n: number): string {
  return String(n).startsWith('8') || n === 11 || n === 18 ? 'an' : 'a'
}

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** "MCG, Melbourne, Australia" from whatever parts the source provides ("" if none). */
export function venueText(v: { name?: string; city?: string; country?: string }): string {
  const parts = [v.name, v.city, v.country].filter((p): p is string => !!p)
  // Avoid "Melbourne Cricket Ground, Melbourne" style repetition only when identical.
  return parts.filter((p, i) => parts.indexOf(p) === i).join(', ')
}

export function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}
