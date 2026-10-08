/**
 * Runs narrative + timeline + analysis over EVERY generated cricket and UFC match
 * (and one StatsBomb event file if a path is given) to catch crashes and bad text.
 *   npm run test:generated [-- path/to/statsbomb/events.json path/to/lineups.json]
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { analyzeCricket } from '../src/services/analysis/cricketAnalysis.ts'
import { analyzeFootball } from '../src/services/analysis/footballAnalysis.ts'
import { analyzeUFC } from '../src/services/analysis/ufcAnalysis.ts'
import { buildNarrative } from '../src/services/narrative/index.ts'
import { buildFootballStats } from '../src/services/providers/statsbomb.ts'
import { buildTimeline } from '../src/services/timeline/buildTimeline.ts'
import type { Competitor, FootballMatchDetail, MatchDetail } from '../src/types/index.ts'
import { resolveCompetitor } from '../src/services/search/resolver.ts'
import { H2H_BUCKETS, bucketOf, pairKey } from '../src/utils/hash.ts'

const DATA = join(import.meta.dirname, '..', 'public', 'data')
const BAD = /undefined|NaN|Infinity|\[object Object\]/
let failures = 0
const samples: string[] = []

function load(sport: string) {
  const names = new Map((JSON.parse(readFileSync(join(DATA, sport, 'competitors.json'), 'utf8')) as Competitor[]).map((c) => [c.id, c.name]))
  const details = readdirSync(join(DATA, sport, 'details')).flatMap((f) => Object.values(JSON.parse(readFileSync(join(DATA, sport, 'details', f), 'utf8')))) as MatchDetail[]
  return { nameOf: (id: string) => names.get(id) ?? id, details }
}

function check(d: MatchDetail, nameOf: (id: string) => string) {
  try {
    const narrative = buildNarrative(d, nameOf)
    const timeline = buildTimeline(d, nameOf)
    const analysis = d.sport === 'cricket' ? analyzeCricket(d, nameOf) : d.sport === 'ufc' ? analyzeUFC(d, nameOf) : analyzeFootball(d as FootballMatchDetail, nameOf)
    const text = JSON.stringify({ narrative, timeline, analysis })
    if (BAD.test(text)) {
      failures++
      if (samples.length < 8) samples.push(`${d.id}: ${text.match(new RegExp(`.{0,90}(${BAD.source}).{0,40}`))?.[0]}`)
    }
    for (let i = 1; i < timeline.length; i++) if (timeline[i].order < timeline[i - 1].order) throw new Error('timeline out of order')
  } catch (e) {
    failures++
    if (samples.length < 8) samples.push(`${d.id}: threw ${(e as Error).message}`)
  }
}

for (const sport of ['cricket', 'ufc']) {
  const { nameOf, details } = load(sport)
  const before = failures
  for (const d of details) check(d, nameOf)
  console.log(`${sport}: ${details.length} matches checked, ${failures - before} problems`)
}

// ---- Search: the product spec's examples must resolve against the real directories.
{
  const comps = (sport: string) => JSON.parse(readFileSync(join(DATA, sport, 'competitors.json'), 'utf8')) as Competitor[]
  const h2h = (sport: string, a: string, b: string) => {
    const key = pairKey(a, b)
    return (JSON.parse(readFileSync(join(DATA, sport, 'h2h', `${bucketOf(key, H2H_BUCKETS)}.json`), 'utf8'))[key] ?? []) as unknown[]
  }
  const pair = (sport: string, qa: string, qb: string): [string, string] | string => {
    const all = comps(sport)
    let ra = resolveCompetitor(all, qa)
    let rb = resolveCompetitor(all, qb)
    const narrow = (r: typeof ra, other: Competitor) =>
      r.status === 'ambiguous' ? (r.candidates.filter((c) => h2h(sport, c.id, other.id).length).length === 1 ? { status: 'resolved' as const, competitor: r.candidates.find((c) => h2h(sport, c.id, other.id).length)! } : r) : r
    if (rb.status === 'resolved') ra = narrow(ra, rb.competitor)
    if (ra.status === 'resolved') rb = narrow(rb, ra.competitor)
    return ra.status === 'resolved' && rb.status === 'resolved' ? [ra.competitor.id, rb.competitor.id] : `${ra.status}/${rb.status}`
  }
  const cases: [string, string, string, string, string][] = [
    ['cricket', 'India', 'Australia', 'india', 'australia'],
    ['cricket', 'IND', 'AUS', 'india', 'australia'],
    ['cricket', 'ind', 'aus', 'india', 'australia'],
    ['cricket', 'England', 'Pakistan', 'england', 'pakistan'],
    ['football', 'Real Madrid', 'Barcelona', 'fb-220', 'fb-217'],
    ['football', 'Madrid', 'Barca', 'fb-220', 'fb-217'],
    ['ufc', 'Islam Makhachev', 'Charles Oliveira', 'islam-makhachev', 'charles-oliveira'],
    ['ufc', 'Makhachev', 'Oliveira', 'islam-makhachev', 'charles-oliveira'],
  ]
  let bad = 0
  for (const [sport, qa, qb, ea, eb] of cases) {
    const r = pair(sport, qa, qb)
    if (typeof r === 'string' || r[0] !== ea || r[1] !== eb) {
      bad++
      samples.push(`search ${sport} "${qa}" vs "${qb}" → ${JSON.stringify(r)}`)
    }
  }
  failures += bad
  console.log(`search: ${cases.length} real-data cases, ${bad} problems`)
}

const [eventsPath, lineupsPath] = process.argv.slice(2)
if (eventsPath && existsSync(eventsPath)) {
  const { nameOf } = load('football')
  const stub = JSON.parse(readFileSync(join(DATA, 'football', 'list', '1.json'), 'utf8')).items[0]
  const sbId = Number(eventsPath.match(/(\d+)\.json$/)?.[1])
  // Find the stub that matches this StatsBomb id
  const all = readdirSync(join(DATA, 'football', 'details')).flatMap((f) => Object.values(JSON.parse(readFileSync(join(DATA, 'football', 'details', f), 'utf8')))) as (FootballMatchDetail & { ref: { statsbomb: number } })[]
  const s = all.find((x) => x.ref?.statsbomb === sbId) ?? stub
  const stats = buildFootballStats(s, JSON.parse(readFileSync(eventsPath, 'utf8')), lineupsPath ? JSON.parse(readFileSync(lineupsPath, 'utf8')) : [])
  const d = { ...s, sport: 'football', stats } as FootballMatchDetail
  const goals = [0, 0]
  for (const g of stats.goals) goals[g.teamId === d.competitorIds[0] ? 0 : 1]++
  console.log(`football ${d.id}: ${nameOf(d.competitorIds[0])} ${goals[0]}–${goals[1]} ${nameOf(d.competitorIds[1])} from events; official ${d.score?.join('–')}; xG ${stats.teamStats?.xg?.join('–')}; possession ${stats.teamStats?.possession?.join('–')}`)
  if (`${goals[0]}–${goals[1]}` !== d.score?.join('–')) {
    failures++
    samples.push(`${d.id}: goals from events don't match official score`)
  }
  check(d, nameOf)
  console.log(buildNarrative(d, nameOf).join('\n'))
}

if (failures) {
  console.error(`✗ ${failures} problem(s). Samples:\n  ${samples.join('\n  ')}`)
  process.exit(1)
}
console.log('✓ All generated matches produce clean narrative, timeline and analysis.')
