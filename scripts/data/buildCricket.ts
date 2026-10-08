/**
 * Cricsheet ball-by-ball JSON → MatchIntel cricket dataset.
 * Every figure is computed from the deliveries, so scorecards are internally consistent
 * (verified afterwards by `npm run validate:data`).
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type {
  BattingEntry, BowlingEntry, Competitor, CricketFormat, CricketKeyMoment, CricketMatchDetail,
  CricketStats, Extras, FallOfWicket, Innings, MatchResult, MatchSummary, Partnership,
} from '../../src/types/index.ts'
import { KNOWN_COLORS, RAW, colorsFor, slug, writeDataset } from './lib.ts'

// ---- Cricsheet types (only what we read) ----
interface Delivery {
  batter: string
  bowler: string
  non_striker: string
  runs: { batter: number; extras: number; total: number; non_boundary?: boolean }
  extras?: { wides?: number; noballs?: number; byes?: number; legbyes?: number; penalty?: number }
  wickets?: { player_out: string; kind: string; fielders?: { name?: string; substitute?: boolean }[] }[]
}
interface CsInnings {
  team: string
  overs?: { over: number; deliveries: Delivery[] }[]
  powerplays?: { from: number; to: number; type: string }[]
  target?: { runs?: number; overs?: number }
  declared?: boolean
  forfeited?: boolean
  super_over?: boolean
  penalty_runs?: { pre?: number; post?: number }
}
interface CsMatch {
  info: {
    teams: string[]
    gender: 'male' | 'female'
    match_type: string
    dates: string[]
    venue?: string
    city?: string
    event?: { name?: string; match_number?: number; stage?: string; group?: string }
    overs?: number
    toss?: { winner: string; decision: 'bat' | 'field' }
    player_of_match?: string[]
    players?: Record<string, string[]>
    officials?: { umpires?: string[] }
    outcome?: { winner?: string; by?: { runs?: number; wickets?: number; innings?: number }; result?: string; method?: string; eliminator?: string }
    balls_per_over?: number
    team_type?: string
  }
  innings?: CsInnings[]
}

const ALIASES: Record<string, string[]> = {
  India: ['ind', 'bharat', 'team india', 'men in blue'],
  Australia: ['aus', 'aussies'],
  England: ['eng'],
  Pakistan: ['pak'],
  'South Africa': ['sa', 'rsa', 'proteas'],
  'New Zealand': ['nz', 'kiwis', 'black caps', 'blackcaps'],
  'Sri Lanka': ['sl', 'lanka'],
  Bangladesh: ['ban', 'bd'],
  'West Indies': ['wi', 'windies'],
  Afghanistan: ['afg'],
  Zimbabwe: ['zim'],
  Ireland: ['ire'],
  Netherlands: ['ned', 'holland'],
  Scotland: ['sco'],
  'United Arab Emirates': ['uae'],
  'United States of America': ['usa', 'us', 'united states'],
  Nepal: ['nep'],
  Oman: ['oma'],
  Namibia: ['nam'],
  Kenya: ['ken'],
  Canada: ['can'],
}
const SHORT: Record<string, string> = {
  India: 'IND', Australia: 'AUS', England: 'ENG', Pakistan: 'PAK', 'South Africa': 'SA', 'New Zealand': 'NZ',
  'Sri Lanka': 'SL', Bangladesh: 'BAN', 'West Indies': 'WI', Afghanistan: 'AFG', Zimbabwe: 'ZIM', Ireland: 'IRE',
  Netherlands: 'NED', Scotland: 'SCO', 'United Arab Emirates': 'UAE', 'United States of America': 'USA', Nepal: 'NEP',
}

const BOWLER_CREDIT = new Set(['bowled', 'caught', 'caught and bowled', 'lbw', 'stumped', 'hit wicket'])
const NOT_A_WICKET = new Set(['retired hurt', 'retired not out'])

const teamId = (team: string, gender: string) => slug(team) + (gender === 'female' ? '-w' : '')
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`
const oversLabel = (balls: number, bpo = 6) => (balls % bpo ? `${Math.floor(balls / bpo)}.${balls % bpo}` : `${balls / bpo}`)

function dismissal(w: NonNullable<Delivery['wickets']>[number], bowler: string): string {
  const f = w.fielders?.map((x) => x.name).filter(Boolean).join('/') ?? ''
  switch (w.kind) {
    case 'caught': return `c ${f || 'sub'} b ${bowler}`
    case 'caught and bowled': return `c & b ${bowler}`
    case 'bowled': return `b ${bowler}`
    case 'lbw': return `lbw b ${bowler}`
    case 'stumped': return `st ${f} b ${bowler}`
    case 'hit wicket': return `hit wicket b ${bowler}`
    case 'run out': return `run out${f ? ` (${f})` : ''}`
    default: return w.kind
  }
}

interface InningsBuild { innings: Innings; moments: CricketKeyMoment[] }

function buildInnings(ci: CsInnings, idx: number, gender: string, format: CricketFormat, maxOvers: number | undefined, bpo: number): InningsBuild {
  const tid = teamId(ci.team, gender)
  const extras: Extras & { penalty?: number } = { byes: 0, legByes: 0, wides: 0, noBalls: 0 }
  const batOrder: string[] = []
  const bat = new Map<string, BattingEntry>()
  const bowl = new Map<string, { legal: number; runs: number; wickets: number; maidens: number }>()
  const bowlerSeq = new Map<string, boolean[]>() // per bowler: wicket flag for each legal delivery (hat-tricks)
  const fow: FallOfWicket[] = []
  const parts: Partnership[] = []
  const moments: CricketKeyMoment[] = []
  const runsPerOver: number[] = []
  const wicketsPerOver: number[] = []
  let runs = (ci.penalty_runs?.pre ?? 0)
  let wickets = 0
  let legal = 0
  let pRuns = 0
  let pBalls = 0
  let pPair: [string, string] = ['', '']
  const bowlerFigs = (name: string) => {
    let b = bowl.get(name)
    if (!b) bowl.set(name, (b = { legal: 0, runs: 0, wickets: 0, maidens: 0 }))
    return b
  }
  const batter = (name: string) => {
    let b = bat.get(name)
    if (!b) {
      bat.set(name, (b = { name, dismissal: 'not out', runs: 0, balls: 0, fours: 0, sixes: 0 }))
      batOrder.push(name)
    }
    return b
  }
  if (ci.penalty_runs?.pre) extras.penalty = ci.penalty_runs.pre

  for (const over of ci.overs ?? []) {
    let overRuns = 0
    let overWkts = 0
    let ballsInOver = 0
    const bowlersThisOver = new Set<string>()
    let concededThisOver = 0
    for (const d of over.deliveries) {
      const ex = d.extras ?? {}
      const isLegal = !ex.wides && !ex.noballs
      const striker = batter(d.batter)
      batter(d.non_striker)
      pPair = [d.batter, d.non_striker]
      bowlersThisOver.add(d.bowler)

      striker.runs += d.runs.batter
      if (!ex.wides) striker.balls += 1
      if (!d.runs.non_boundary && d.runs.batter === 4) striker.fours++
      if (!d.runs.non_boundary && d.runs.batter === 6) striker.sixes++

      extras.wides += ex.wides ?? 0
      extras.noBalls += ex.noballs ?? 0
      extras.byes += ex.byes ?? 0
      extras.legByes += ex.legbyes ?? 0
      if (ex.penalty) extras.penalty = (extras.penalty ?? 0) + ex.penalty

      const b = bowlerFigs(d.bowler)
      const conceded = d.runs.batter + (ex.wides ?? 0) + (ex.noballs ?? 0)
      b.runs += conceded
      concededThisOver += conceded
      if (isLegal) {
        b.legal++
        legal++
        ballsInOver++
        pBalls++
      }

      const before = striker.runs - d.runs.batter
      for (const m of [50, 100, 150, 200, 250, 300]) {
        if (before < m && striker.runs >= m) {
          moments.push({ over: `${over.over}.${Math.max(ballsInOver, 1)}`, innings: idx, type: 'milestone', teamId: tid, text: `${d.batter} reaches ${m} off ${striker.balls} balls.`, major: m >= 100 })
        }
      }

      runs += d.runs.total
      overRuns += d.runs.total
      pRuns += d.runs.total

      let creditedWicket = false
      for (const w of d.wickets ?? []) {
        const out = batter(w.player_out)
        out.dismissal = NOT_A_WICKET.has(w.kind) ? w.kind : dismissal(w, d.bowler)
        if (NOT_A_WICKET.has(w.kind)) continue
        wickets++
        overWkts++
        const label = `${over.over}.${isLegal ? ballsInOver : ballsInOver + 1}`
        fow.push({ wicket: wickets, score: runs, over: label, batter: w.player_out })
        parts.push({ wicket: wickets, runs: pRuns, balls: pBalls, batters: pPair })
        pRuns = 0
        pBalls = 0
        if (BOWLER_CREDIT.has(w.kind)) {
          b.wickets++
          creditedWicket = true
          if (b.wickets === 5) moments.push({ over: label, innings: idx, type: 'wicket', teamId: tid, text: `${d.bowler} completes a five-wicket haul.`, major: true })
        }
      }
      if (isLegal) {
        const seq = bowlerSeq.get(d.bowler) ?? []
        seq.push(creditedWicket)
        bowlerSeq.set(d.bowler, seq)
        if (seq.length >= 3 && seq.slice(-3).every(Boolean)) {
          moments.push({ over: `${over.over}.${ballsInOver}`, innings: idx, type: 'wicket', teamId: tid, text: `Hat-trick for ${d.bowler}!`, major: true })
        }
      } else if (creditedWicket) {
        // stumped off a wide etc. still counts toward a hat-trick sequence
        const seq = bowlerSeq.get(d.bowler) ?? []
        seq.push(true)
        bowlerSeq.set(d.bowler, seq)
      }
    }
    runsPerOver[over.over] = overRuns
    wicketsPerOver[over.over] = overWkts
    if (bowlersThisOver.size === 1 && ballsInOver === bpo && concededThisOver === 0) {
      bowlFigsMaiden(bowl, [...bowlersThisOver][0])
    }
    const expensive = format === 'Test' ? 20 : 22
    if (overRuns >= expensive && bowlersThisOver.size === 1) {
      moments.push({ over: `${over.over}.${ballsInOver}`, innings: idx, type: 'note', teamId: tid, text: `${[...bowlersThisOver][0]}'s over goes for ${overRuns} runs.` })
    }
  }
  if (ci.penalty_runs?.post) {
    runs += ci.penalty_runs.post
    extras.penalty = (extras.penalty ?? 0) + ci.penalty_runs.post
  }
  // Unbroken final partnership
  if (legal > 0 || pRuns > 0) parts.push({ wicket: wickets + 1, runs: pRuns, balls: pBalls, batters: pPair })

  // Powerplay: first mandatory block starting at 0.1
  let powerplay: Innings['powerplay']
  const pp = ci.powerplays?.find((p) => p.type === 'mandatory' && p.from <= 0.1 + 1e-9)
  if (pp) {
    const lastOver = Math.floor(pp.to)
    const ppRuns = runsPerOver.slice(0, lastOver + 1).reduce((s, r) => s + (r ?? 0), 0)
    const ppWkts = wicketsPerOver.slice(0, lastOver + 1).reduce((s, r) => s + (r ?? 0), 0)
    powerplay = { label: `Overs 1–${lastOver + 1}`, runs: ppRuns, wickets: ppWkts }
  }

  const bowling: BowlingEntry[] = [...bowl.entries()].map(([name, b]) => ({ name, overs: oversLabel(b.legal, bpo), maidens: b.maidens, runs: b.runs, wickets: b.wickets }))
  const innings: Innings = {
    battingTeamId: tid,
    runs,
    wickets,
    overs: oversLabel(legal, bpo),
    maxOvers,
    extras,
    batting: batOrder.map((n) => bat.get(n)!),
    bowling,
    fallOfWickets: fow,
    partnerships: parts.filter((p) => p.runs > 0 || p.balls > 0 || p.wicket <= wickets),
    powerplay,
    runsPerOver: Array.from(runsPerOver, (r) => r ?? 0),
    wicketsPerOver: Array.from(wicketsPerOver, (w) => w ?? 0),
  }
  if (ci.declared) innings.declared = true
  if (ci.forfeited) innings.forfeited = true
  if (ci.target?.runs) innings.target = ci.target.runs
  return { innings, moments }
}

function bowlFigsMaiden(bowl: Map<string, { maidens: number }>, name: string) {
  const b = bowl.get(name)
  if (b) b.maidens++
}

function teamScore(innings: Innings[], tid: string, format: CricketFormat): string {
  const mine = innings.filter((i) => i.battingTeamId === tid)
  if (mine.length === 0) return '—'
  return mine
    .map((i) => {
      const r = i.wickets >= 10 ? `${i.runs}` : `${i.runs}/${i.wickets}${i.declared ? 'd' : ''}`
      return format === 'Test' ? r : `${r} (${i.overs})`
    })
    .join(' & ')
}

function resultOf(m: CsMatch, gender: string, lastInnings: Innings | undefined, format: CricketFormat): MatchResult {
  const o = m.info.outcome ?? {}
  const method = o.method ? ` (${o.method === 'D/L' ? 'DLS' : o.method} method)` : ''
  if (o.winner) {
    const W = o.winner + (gender === 'female' ? ' Women' : '')
    const wid = teamId(o.winner, gender)
    let text = `${W} won`
    if (o.by?.innings) text += ` by an innings and ${plural(o.by.runs ?? 0, 'run')}`
    else if (o.by?.runs !== undefined) text += ` by ${plural(o.by.runs, 'run')}`
    else if (o.by?.wickets !== undefined) {
      text += ` by ${plural(o.by.wickets, 'wicket')}`
      if (format !== 'Test' && lastInnings?.maxOvers && !o.method && lastInnings.battingTeamId === wid) {
        const left = lastInnings.maxOvers * 6 - (Number(lastInnings.overs.split('.')[0]) * 6 + Number(lastInnings.overs.split('.')[1] ?? 0))
        if (left > 0) text += ` (${plural(left, 'ball')} left)`
      }
    } else text += ' (awarded)'
    return { outcome: 'win', winnerId: wid, text: text + method }
  }
  if (o.result === 'tie') {
    return { outcome: 'tie', winnerId: null, text: `Match tied${o.eliminator ? ` (${o.eliminator}${gender === 'female' ? ' Women' : ''} won the Super Over)` : ''}` }
  }
  if (o.result === 'draw') return { outcome: 'draw', winnerId: null, text: 'Match drawn' }
  return { outcome: 'no-result', winnerId: null, text: 'No result' }
}

const FORMAT: Record<string, CricketFormat> = { ODI: 'ODI', T20: 'T20I', Test: 'Test' }

export function buildCricket() {
  const competitors = new Map<string, Competitor>()
  const summaries: MatchSummary[] = []
  const details = new Map<string, CricketMatchDetail>()
  let skipped = 0

  for (const folder of ['odis', 't20s', 'tests']) {
    const dir = join(RAW, 'cricsheet', folder)
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.json')) continue
      const m = JSON.parse(readFileSync(join(dir, file), 'utf8')) as CsMatch
      const info = m.info
      const format = FORMAT[info.match_type]
      if (!format || info.teams?.length !== 2 || info.team_type === 'club') {
        skipped++
        continue
      }
      const gender = info.gender
      const ids = info.teams.map((t) => teamId(t, gender)) as [string, string]
      info.teams.forEach((t, i) => {
        if (competitors.has(ids[i])) return
        const women = gender === 'female'
        const base = ALIASES[t] ?? []
        const short = (SHORT[t] ?? t.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()) + (women ? '-W' : '')
        competitors.set(ids[i], {
          id: ids[i], sport: 'cricket', kind: 'team',
          name: women ? `${t} Women` : t,
          shortName: short,
          aliases: women ? [...base.map((a) => `${a} women`), ...base.map((a) => `${a}w`), `${t} w`, `${t} women`] : base,
          subtitle: women ? 'Women' : 'Men',
          country: t,
          colors: KNOWN_COLORS[t] ?? colorsFor(t),
        })
      })

      const bpo = info.balls_per_over ?? 6
      const main = (m.innings ?? []).filter((x) => !x.super_over)
      const superOvers = (m.innings ?? []).filter((x) => x.super_over)
      const built = main.map((ci, i) => {
        const revised = i > 0 && ci.target?.overs ? ci.target.overs : undefined
        return buildInnings(ci, i, gender, format, format === 'Test' ? undefined : revised ?? info.overs, bpo)
      })
      const innings = built.map((b) => b.innings)
      // Limited-overs chase target when Cricsheet didn't state it.
      if (format !== 'Test' && innings[1] && !innings[1].target) innings[1].target = innings[0].runs + 1

      const id = `cri-${file.replace('.json', '')}`
      const result = resultOf(m, gender, innings.at(-1), format)
      const genderLabel = gender === 'female' ? "Women's " : ''
      const summary: MatchSummary = {
        id,
        sport: 'cricket',
        date: info.dates[0],
        competition: info.event?.name ?? `${genderLabel}${format}`,
        stage: [`${genderLabel}${format}`, info.event?.match_number ? `Match ${info.event.match_number}` : info.event?.stage, info.event?.group ? `Group ${info.event.group}` : undefined].filter(Boolean).join(' · '),
        venue: { name: info.venue, city: info.city },
        competitorIds: ids,
        score: innings.length ? [teamScore(innings, ids[0], format), teamScore(innings, ids[1], format)] : null,
        result,
        source: { provider: 'Cricsheet (cricsheet.org) — open data', isDemo: false, url: 'https://cricsheet.org/' },
        hasDetail: innings.length > 0,
      }
      summaries.push(summary)
      if (!innings.length) continue

      const potm = info.player_of_match?.[0]
      const potmTeam = potm ? info.teams.find((t) => info.players?.[t]?.includes(potm)) : undefined
      const stats: CricketStats = {
        format,
        toss: info.toss ? { winnerId: teamId(info.toss.winner, gender), decision: info.toss.decision === 'field' ? 'bowl' : 'bat' } : undefined,
        playerOfTheMatch: potm && potmTeam ? { name: potm, teamId: teamId(potmTeam, gender) } : undefined,
        innings,
        keyMoments: built.flatMap((b) => b.moments),
        method: info.outcome?.method,
        officials: info.officials?.umpires,
      }
      // Did not bat
      innings.forEach((inn, i) => {
        const team = info.teams[ids.indexOf(inn.battingTeamId)]
        const played = new Set(inn.batting?.map((b) => b.name))
        const dnb = (info.players?.[team] ?? []).filter((p) => !played.has(p))
        if (dnb.length && !inn.forfeited) inn.didNotBat = dnb
        void i
      })
      if (superOvers.length) {
        stats.superOvers = superOvers.map((so) => {
          const b = buildInnings(so, 0, gender, format, 1, bpo).innings
          return { teamId: b.battingTeamId, runs: b.runs, wickets: b.wickets }
        })
      }
      details.set(id, { ...summary, sport: 'cricket', stats })
    }
  }
  console.log(`  cricket: skipped ${skipped} non-international/unsupported files`)
  writeDataset('cricket', [...competitors.values()], summaries, details)
}
