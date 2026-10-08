import type { Competitor } from '@/types'

/** Lowercase, strip accents ("Barça" → "barca") and punctuation. */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return row[b.length]
}

/** 0 = no match, 100 = exact. */
export function scoreCompetitor(c: Competitor, rawQuery: string): number {
  const q = normalize(rawQuery)
  if (!q) return 0
  const name = normalize(c.name)
  const names = [name, normalize(c.shortName), ...c.aliases.map(normalize)]

  if (names.includes(q)) return 100
  if (name.startsWith(q)) return 85
  if (names.some((n) => n.startsWith(q))) return 75
  if (name.split(' ').some((t) => t.startsWith(q))) return 70
  if (q.length >= 3 && names.some((n) => n.includes(q))) return 55

  // Typo tolerance for longer queries ("makachev", "barcelone").
  if (q.length >= 4) {
    const tokens = new Set(names.flatMap((n) => [n, ...n.split(' ')]))
    const maxDist = q.length >= 7 ? 2 : 1
    for (const t of tokens) {
      if (Math.abs(t.length - q.length) <= maxDist && levenshtein(t, q) <= maxDist) return 40
    }
  }
  return 0
}

export function rankCompetitors(all: Competitor[], query: string, limit = 6): Competitor[] {
  return all
    .map((c) => ({ c, s: scoreCompetitor(c, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || (b.c.matchCount ?? 0) - (a.c.matchCount ?? 0) || a.c.name.localeCompare(b.c.name))
    .slice(0, limit)
    .map((x) => x.c)
}

export type ResolveResult =
  | { status: 'resolved'; competitor: Competitor }
  | { status: 'ambiguous'; candidates: Competitor[] }
  | { status: 'unknown' }

/** Resolve free text to one competitor, or explain why not. */
export function resolveCompetitor(all: Competitor[], query: string): ResolveResult {
  const scored = all
    .map((c) => ({ c, s: scoreCompetitor(c, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || (b.c.matchCount ?? 0) - (a.c.matchCount ?? 0))
  if (scored.length === 0) return { status: 'unknown' }
  if (scored.length === 1 || scored[0].s > scored[1].s) return { status: 'resolved', competitor: scored[0].c }
  return { status: 'ambiguous', candidates: scored.filter((x) => x.s === scored[0].s).map((x) => x.c) }
}

/** Split "India vs Australia" / "IND v AUS" / "Madrid versus Barca" into two parts. */
export function splitMatchup(text: string): [string, string] | null {
  const parts = text.split(/\s+(?:vs\.?|v\.?|versus)\s+/i)
  if (parts.length !== 2) return null
  const [a, b] = parts.map((p) => p.trim())
  return a && b ? [a, b] : null
}
