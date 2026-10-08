/**
 * Consistency checks for match data.
 *   npm run validate:data                 # demo fixtures
 *   npm run validate:data -- --generated  # the real dataset in public/data (after data:build)
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import * as mock from '../src/data/mock/index.ts'
import type { Competitor, CricketMatchDetail, FootballMatchDetail, MatchSummary, UFCMatchDetail } from '../src/types/index.ts'
import type { Innings } from '../src/types/cricket.ts'
import type { FighterFightStats } from '../src/types/ufc.ts'

const generated = process.argv.includes('--generated')
const DATA = join(import.meta.dirname, '..', 'public', 'data')

function loadGenerated<T>(sport: string): { competitors: Competitor[]; details: T[]; summaries: MatchSummary[] } {
  const dir = join(DATA, sport)
  if (!existsSync(dir)) throw new Error(`No generated data for ${sport}. Run npm run data:build first.`)
  const competitors = JSON.parse(readFileSync(join(dir, 'competitors.json'), 'utf8'))
  const details = readdirSync(join(dir, 'details')).flatMap((f) => Object.values(JSON.parse(readFileSync(join(dir, 'details', f), 'utf8'))) as T[])
  const summaries = readdirSync(join(dir, 'list')).flatMap((f) => JSON.parse(readFileSync(join(dir, 'list', f), 'utf8')).items as MatchSummary[])
  return { competitors, details, summaries }
}

let cricketDetails: CricketMatchDetail[]
let footballDetails: FootballMatchDetail[]
let ufcDetails: UFCMatchDetail[]
let allSummaries: MatchSummary[]
let allCompetitors: Competitor[]
if (generated) {
  const c = loadGenerated<CricketMatchDetail>('cricket')
  const f = loadGenerated<FootballMatchDetail>('football')
  const u = loadGenerated<UFCMatchDetail>('ufc')
  cricketDetails = c.details
  footballDetails = [] // football details are built in the browser from StatsBomb events
  ufcDetails = u.details
  allSummaries = [...c.summaries, ...f.summaries, ...u.summaries]
  allCompetitors = [...c.competitors, ...f.competitors, ...u.competitors]
} else {
  cricketDetails = mock.cricketDetails
  footballDetails = mock.footballDetails
  ufcDetails = mock.ufcDetails
  allSummaries = [...mock.cricketDetails, ...mock.footballDetails, ...mock.ufcDetails, ...mock.cricketSummariesOnly, ...mock.footballSummariesOnly]
  allCompetitors = mock.mockCompetitors
}

const errors: string[] = []
const warnings: string[] = []
const fail = (where: string, msg: string) => errors.push(`${where}: ${msg}`)
const eq = (where: string, label: string, actual: number, expected: number) => {
  if (actual !== expected) fail(where, `${label} = ${actual}, expected ${expected}`)
}

const oversToBalls = (o: string) => {
  const [whole, part = '0'] = o.split('.')
  return Number(whole) * 6 + Number(part)
}
const clockToSec = (t: string) => {
  const [m, s] = t.split(':').map(Number)
  return m * 60 + s
}

const competitorIds = new Set(allCompetitors.map((c) => c.id))
const allIds = new Set<string>()
for (const m of allSummaries) {
  if (allIds.has(m.id)) fail(m.id, 'duplicate match id')
  allIds.add(m.id)
  for (const c of m.competitorIds) if (!competitorIds.has(c)) fail(m.id, `unknown competitor ${c}`)
  if (m.source.isDemo !== !generated) fail(m.id, generated ? 'real data must not be flagged isDemo' : 'mock data must be flagged isDemo')
  if (m.result.winnerId && !m.competitorIds.includes(m.result.winnerId)) fail(m.id, 'winner is not a competitor')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(m.date)) fail(m.id, `bad date ${m.date}`)
}

const NOT_OUT = /^(not out|retired hurt|retired not out)$/

function checkInnings(where: string, inn: Innings) {
  if (inn.batting && inn.extras) {
    const e = inn.extras as Innings['extras'] & { penalty?: number }
    const extras = e.byes + e.legByes + e.wides + e.noBalls + (e.penalty ?? 0)
    eq(where, 'batting runs + extras', inn.batting.reduce((s, b) => s + b.runs, 0) + extras, inn.runs)
    const out = inn.batting.filter((b) => !NOT_OUT.test(b.dismissal)).length
    eq(where, 'dismissed batters', out, inn.wickets)
    // Balls faced include no-balls (a batter faces them) but not wides.
    const balls = inn.batting.reduce((s, b) => s + b.balls, 0)
    const legal = oversToBalls(inn.overs)
    if (balls < legal || balls > legal + e.noBalls) fail(where, `balls faced ${balls} outside [${legal}, ${legal + e.noBalls}]`)
    if (inn.bowling) {
      eq(where, 'bowling runs', inn.bowling.reduce((s, b) => s + b.runs, 0), inn.runs - e.byes - e.legByes - (e.penalty ?? 0))
      const notBowlers = inn.batting.filter((b) => /^(run out|retired out|obstructing the field|handled the ball|timed out|hit the ball twice)/.test(b.dismissal)).length
      eq(where, 'bowler wickets', inn.bowling.reduce((s, b) => s + b.wickets, 0), inn.wickets - notBowlers)
      eq(where, 'bowling balls', inn.bowling.reduce((s, b) => s + oversToBalls(b.overs), 0), oversToBalls(inn.overs))
    }
  }
  if (inn.fallOfWickets) {
    eq(where, 'FoW count', inn.fallOfWickets.length, inn.wickets)
    let prev = 0
    for (const f of inn.fallOfWickets) {
      if (f.score < prev) fail(where, `FoW ${f.wicket} score decreases`)
      if (f.score > inn.runs) fail(where, `FoW ${f.wicket} exceeds total`)
      prev = f.score
    }
  }
  if (inn.partnerships) {
    // Innings-level penalty runs (awarded before/after play) belong to no partnership.
    const pRuns = inn.partnerships.reduce((s, p) => s + p.runs, 0)
    const penalty = (inn.extras as { penalty?: number } | undefined)?.penalty ?? 0
    if (pRuns !== inn.runs && pRuns !== inn.runs - penalty) fail(where, `partnership runs = ${pRuns}, expected ${inn.runs}`)
    eq(where, 'partnership balls', inn.partnerships.reduce((s, p) => s + p.balls, 0), oversToBalls(inn.overs))
  }
}

for (const m of cricketDetails) {
  m.stats.innings.forEach((inn, i) => checkInnings(`${m.id} inn${i + 1}`, inn))
  const [a, b] = m.stats.innings
  const limitedOvers = m.stats.format !== 'Test'
  // Real sources state revised (rain-reduced) targets, so this check applies to the demo fixtures only.
  if (!generated && limitedOvers && b?.target !== undefined) eq(m.id, 'target', b.target, a.runs + 1)
  if (limitedOvers && !m.stats.method && m.result.outcome === 'win' && a && b && m.stats.innings.length === 2) {
    const winner = a.runs > b.runs ? a.battingTeamId : b.battingTeamId
    if (winner !== m.result.winnerId) fail(m.id, 'winner does not match innings totals')
  }
}

for (const m of footballDetails) {
  const [home, away] = m.competitorIds
  const tally = [0, 0]
  for (const g of m.stats.goals) {
    // An own goal is listed under the team that benefits.
    tally[g.teamId === home ? 0 : g.teamId === away ? 1 : -1] += 1
    if (g.teamId !== home && g.teamId !== away) fail(m.id, `goal for unknown team ${g.teamId}`)
  }
  eq(m.id, 'home goals', tally[0], m.stats.fullTime[0])
  eq(m.id, 'away goals', tally[1], m.stats.fullTime[1])
  if (m.stats.halfTime) {
    const ht = [0, 0]
    for (const g of m.stats.goals) if (g.minute <= 45) ht[g.teamId === home ? 0 : 1] += 1
    eq(m.id, 'HT home', ht[0], m.stats.halfTime[0])
    eq(m.id, 'HT away', ht[1], m.stats.halfTime[1])
  }
  const p = m.stats.teamStats?.possession
  if (p) eq(m.id, 'possession sum', p[0] + p[1], 100)
  const s = m.stats.teamStats
  if (s?.shots && s.shotsOnTarget) for (const i of [0, 1]) if (s.shotsOnTarget[i] > s.shots[i]) fail(m.id, 'SoT > shots')
  const winner = m.stats.fullTime[0] === m.stats.fullTime[1] ? null : m.stats.fullTime[0] > m.stats.fullTime[1] ? home : away
  if (winner !== m.result.winnerId) fail(m.id, 'winner does not match score')
}

const sumRounds = (rounds: FighterFightStats[]) => ({
  sig: rounds.reduce((s, r) => s + (r.sigStrikes?.landed ?? 0), 0),
  sigAtt: rounds.reduce((s, r) => s + (r.sigStrikes?.attempted ?? 0), 0),
  td: rounds.reduce((s, r) => s + (r.takedowns?.landed ?? 0), 0),
  tdAtt: rounds.reduce((s, r) => s + (r.takedowns?.attempted ?? 0), 0),
  sub: rounds.reduce((s, r) => s + (r.submissionAttempts ?? 0), 0),
  kd: rounds.reduce((s, r) => s + (r.knockdowns ?? 0), 0),
  ctrl: rounds.reduce((s, r) => s + clockToSec(r.controlTime ?? '0:00'), 0),
})

for (const m of ufcDetails) {
  const st = m.stats
  if (st.rounds) {
    eq(m.id, 'round count', st.rounds.length, st.endRound)
    for (const i of [0, 1] as const) {
      const sum = sumRounds(st.rounds.map((r) => r.fighters[i]))
      const t = st.totals[i]
      const w = `${m.id} fighter${i + 1}`
      eq(w, 'sig landed', sum.sig, t.sigStrikes?.landed ?? 0)
      eq(w, 'sig attempted', sum.sigAtt, t.sigStrikes?.attempted ?? 0)
      eq(w, 'td landed', sum.td, t.takedowns?.landed ?? 0)
      eq(w, 'td attempted', sum.tdAtt, t.takedowns?.attempted ?? 0)
      eq(w, 'sub attempts', sum.sub, t.submissionAttempts ?? 0)
      eq(w, 'knockdowns', sum.kd, t.knockdowns ?? 0)
      eq(w, 'control seconds', sum.ctrl, clockToSec(t.controlTime ?? '0:00'))
      if (t.totalStrikes && t.sigStrikes && t.totalStrikes.landed < t.sigStrikes.landed) fail(w, 'total < significant')
    }
  }
  if (st.scorecards) {
    const winnerIdx = m.competitorIds.indexOf(m.result.winnerId ?? '')
    const wonCards = st.scorecards.filter((c) => c.scores[winnerIdx] > c.scores[1 - winnerIdx]).length
    if (st.method === 'Decision (Unanimous)' && wonCards !== st.scorecards.length) (generated ? warnings : errors).push(`${m.id}: labelled unanimous but cards disagree (source data)`)
  }
}

if (warnings.length) console.warn(`⚠ ${warnings.length} source inconsistenc${warnings.length === 1 ? 'y' : 'ies'} (shown as published):\n  ` + warnings.join('\n  '))
if (errors.length) {
  console.error(`✗ ${errors.length} data problem(s):\n  ` + errors.join('\n  '))
  process.exit(1)
}
console.log(`✓ ${generated ? 'Generated' : 'Demo'} data valid: ${cricketDetails.length} cricket, ${footballDetails.length} football, ${ufcDetails.length} UFC detailed records; ${allIds.size} matches total.`)
