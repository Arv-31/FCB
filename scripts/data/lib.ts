import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Competitor, MatchSummary, SportId } from '../../src/types/index.ts'
import { DETAIL_BUCKETS, H2H_BUCKETS, bucketOf, pairKey } from '../../src/utils/hash.ts'

export const RAW = join(import.meta.dirname, '..', '..', '.data-cache', 'raw')
export const OUT = join(import.meta.dirname, '..', '..', 'public', 'data')
export const LIST_PAGE_SIZE = 24

export function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Deterministic, pleasant team colours for competitors without curated ones. */
export function colorsFor(name: string): { primary: string; secondary: string } {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const hue = h % 360
  return { primary: hsl(hue, 62, 48), secondary: hsl((hue + 40) % 360, 55, 32) }
}

function hsl(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return '#' + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('')
}

const json = (v: unknown) => JSON.stringify(v)

/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF). Returns objects keyed by header. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') (field += '"'), i++
        else quoted = false
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') row.push(field), (field = '')
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field || row.length) row.push(field), rows.push(row)
  const [head, ...body] = rows
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])))
}

/**
 * Writes one sport's static dataset:
 *   competitors.json
 *   h2h/<bucket>.json     { [pairKey]: MatchSummary[] }  (newest first)
 *   details/<bucket>.json { [matchId]: MatchDetail | stub }
 *   list/<page>.json      newest-first pages for the Browse view
 *   meta.json
 */
export function writeDataset(sport: SportId, competitors: Competitor[], summaries: MatchSummary[], details: Map<string, unknown>, extraMeta: Record<string, unknown> = {}) {
  const dir = join(OUT, sport)
  rmSync(dir, { recursive: true, force: true })
  for (const sub of ['h2h', 'details', 'list']) mkdirSync(join(dir, sub), { recursive: true })

  const sorted = [...summaries].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))

  // Match counts drive search ranking.
  const counts = new Map<string, number>()
  for (const m of sorted) for (const id of m.competitorIds) counts.set(id, (counts.get(id) ?? 0) + 1)
  const comps = competitors
    .filter((c) => counts.has(c.id))
    .map((c) => ({ ...c, matchCount: counts.get(c.id) }))
    .sort((a, b) => (b.matchCount ?? 0) - (a.matchCount ?? 0) || a.name.localeCompare(b.name))
  writeFileSync(join(dir, 'competitors.json'), json(comps))

  const h2h: Record<string, MatchSummary[]>[] = Array.from({ length: H2H_BUCKETS }, () => ({}))
  for (const m of sorted) {
    const key = pairKey(m.competitorIds[0], m.competitorIds[1])
    ;(h2h[bucketOf(key, H2H_BUCKETS)][key] ??= []).push(m)
  }
  h2h.forEach((b, i) => writeFileSync(join(dir, 'h2h', `${i}.json`), json(b)))

  const det: Record<string, unknown>[] = Array.from({ length: DETAIL_BUCKETS }, () => ({}))
  for (const [id, d] of details) det[bucketOf(id, DETAIL_BUCKETS)][id] = d
  det.forEach((b, i) => writeFileSync(join(dir, 'details', `${i}.json`), json(b)))

  const pages = Math.max(1, Math.ceil(sorted.length / LIST_PAGE_SIZE))
  for (let p = 1; p <= pages; p++) {
    const items = sorted.slice((p - 1) * LIST_PAGE_SIZE, p * LIST_PAGE_SIZE)
    writeFileSync(join(dir, 'list', `${p}.json`), json({ items, page: p, pageSize: LIST_PAGE_SIZE, total: sorted.length, hasMore: p < pages }))
  }

  writeFileSync(join(dir, 'meta.json'), json({ sport, matches: sorted.length, competitors: comps.length, builtAt: new Date().toISOString(), newest: sorted[0]?.date, oldest: sorted.at(-1)?.date, ...extraMeta }))
  console.log(`  ${sport}: ${sorted.length} matches, ${comps.length} competitors, ${details.size} detail records`)
}

/** Curated colours for well-known competitors (by exact name). */
export const KNOWN_COLORS: Record<string, { primary: string; secondary: string }> = {
  India: { primary: '#2563eb', secondary: '#f97316' },
  Australia: { primary: '#eab308', secondary: '#15803d' },
  England: { primary: '#1e40af', secondary: '#dc2626' },
  Pakistan: { primary: '#15803d', secondary: '#14532d' },
  'South Africa': { primary: '#16a34a', secondary: '#facc15' },
  'New Zealand': { primary: '#111827', secondary: '#6b7280' },
  'Sri Lanka': { primary: '#1d4ed8', secondary: '#facc15' },
  Bangladesh: { primary: '#047857', secondary: '#dc2626' },
  'West Indies': { primary: '#7f1d1d', secondary: '#facc15' },
  Afghanistan: { primary: '#1d4ed8', secondary: '#dc2626' },
  'Real Madrid': { primary: '#f8fafc', secondary: '#7c3aed' },
  Barcelona: { primary: '#a50044', secondary: '#004d98' },
  'Manchester United': { primary: '#da291c', secondary: '#fbe122' },
  Liverpool: { primary: '#c8102e', secondary: '#00b2a9' },
  'Manchester City': { primary: '#6cabdd', secondary: '#1c2c5b' },
  Arsenal: { primary: '#ef0107', secondary: '#063672' },
  Chelsea: { primary: '#034694', secondary: '#dba111' },
  'Atlético Madrid': { primary: '#cb3524', secondary: '#272e61' },
  'Bayern Munich': { primary: '#dc052d', secondary: '#0066b2' },
  Argentina: { primary: '#75aadb', secondary: '#f6b40e' },
  France: { primary: '#1e3a8a', secondary: '#dc2626' },
  Brazil: { primary: '#facc15', secondary: '#15803d' },
  Germany: { primary: '#111827', secondary: '#dc2626' },
  Spain: { primary: '#c60b1e', secondary: '#ffc400' },
}
