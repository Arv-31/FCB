/**
 * UFCStats (via github.com/Greco1899/scrape_ufc_stats CSVs) → MatchIntel UFC dataset.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type {
  Attempted, Competitor, FighterFightStats, FinishMethod, JudgeScorecard, MatchResult, MatchSummary,
  RoundStats, UFCKeyMoment, UFCMatchDetail, UFCStats,
} from '../../src/types/index.ts'
import { RAW, colorsFor, parseCsv, slug, writeDataset } from './lib.ts'

const read = (f: string) => parseCsv(readFileSync(join(RAW, 'ufc', f), 'utf8'))

const MONTHS: Record<string, string> = { January: '01', February: '02', March: '03', April: '04', May: '05', June: '06', July: '07', August: '08', September: '09', October: '10', November: '11', December: '12' }
function isoDate(s: string): string {
  const m = s.match(/^(\w+) (\d{1,2}), (\d{4})$/)
  return m ? `${m[3]}-${MONTHS[m[1]]}-${m[2].padStart(2, '0')}` : ''
}

const att = (s: string | undefined): Attempted | undefined => {
  const m = s?.match(/^(\d+) of (\d+)$/)
  return m ? { landed: Number(m[1]), attempted: Number(m[2]) } : undefined
}
// Counts appear as "1" or "1.0" in the source.
const num = (s: string | undefined) => (s && /^\d+(\.0+)?$/.test(s) ? Math.round(Number(s)) : undefined)
const ctrl = (s: string | undefined) => (s && /^\d+:\d{2}$/.test(s) ? s : undefined)
const toSec = (t: string) => {
  const [m, s] = t.split(':').map(Number)
  return m * 60 + s
}
const toClock = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`

function addAtt(a?: Attempted, b?: Attempted): Attempted | undefined {
  if (!a) return b && { ...b }
  if (!b) return a
  return { landed: a.landed + b.landed, attempted: a.attempted + b.attempted }
}

function sumRounds(rs: FighterFightStats[]): FighterFightStats {
  const keys = ['sigStrikes', 'totalStrikes', 'takedowns', 'head', 'body', 'leg', 'distance', 'clinch', 'ground'] as const
  const t: FighterFightStats = {}
  for (const k of keys) for (const r of rs) t[k] = addAtt(t[k], r[k])
  for (const k of ['knockdowns', 'submissionAttempts', 'reversals'] as const) {
    if (rs.some((r) => r[k] !== undefined)) t[k] = rs.reduce((s, r) => s + (r[k] ?? 0), 0)
  }
  if (rs.some((r) => r.controlTime)) t.controlTime = toClock(rs.reduce((s, r) => s + (r.controlTime ? toSec(r.controlTime) : 0), 0))
  return t
}

function method(raw: string): FinishMethod {
  if (raw.startsWith('Decision - Unanimous')) return 'Decision (Unanimous)'
  if (raw.startsWith('Decision - Split')) return 'Decision (Split)'
  if (raw.startsWith('Decision - Majority')) return 'Decision (Majority)'
  if (raw.startsWith('KO/TKO') || raw.startsWith('TKO')) return 'KO/TKO'
  if (raw.startsWith('Submission')) return 'Submission'
  if (raw.startsWith('DQ')) return 'DQ'
  if (raw === 'Overturned' || raw === 'Could Not Continue' || raw === 'Other') return 'No Contest'
  return 'No Contest'
}

/** Parses "Sal D'amato 47 - 48.Mike Bell 47 - 48." into cards in published order. */
function parseCards(details: string): JudgeScorecard[] {
  const out: JudgeScorecard[] = []
  const re = /([^.]+?)\s+(\d{1,2})\s*-\s*(\d{1,2})\.?/g
  let m: RegExpExecArray | null
  while ((m = re.exec(details))) out.push({ judge: m[1].trim(), scores: [Number(m[2]), Number(m[3])] })
  return out
}

export function buildUfc() {
  const events = new Map(read('ufc_event_details.csv').map((e) => [e.EVENT, e]))
  const nicknames = new Map<string, string>()
  for (const f of read('ufc_fighter_details.csv')) {
    const name = `${f.FIRST} ${f.LAST}`.trim()
    if (f.NICKNAME) nicknames.set(name, f.NICKNAME)
  }
  const statsRows = read('ufc_fight_stats.csv')
  const statsByBout = new Map<string, Record<string, string>[]>()
  for (const r of statsRows) {
    const k = `${r.EVENT}|${r.BOUT}`
    ;(statsByBout.get(k) ?? statsByBout.set(k, []).get(k)!).push(r)
  }

  const results = read('ufc_fight_results.csv')
    .map((r): Record<string, string> & { date: string } => ({ ...r, date: isoDate(events.get(r.EVENT)?.DATE ?? '') }))
    .filter((r) => r.date)
    // Oldest first so career records can be accumulated.
    .sort((a, b) => a.date.localeCompare(b.date))

  const competitors = new Map<string, Competitor>()
  const record = new Map<string, { w: number; l: number; d: number; nc: number }>()
  const recStr = (id: string) => {
    const r = record.get(id) ?? { w: 0, l: 0, d: 0, nc: 0 }
    return `${r.w}-${r.l}-${r.d}${r.nc ? ` (${r.nc} NC)` : ''}`
  }
  const summaries: MatchSummary[] = []
  const details = new Map<string, UFCMatchDetail>()

  for (const r of results) {
    const names = r.BOUT.split(/\s+vs\.\s+/).map((s) => s.trim())
    if (names.length !== 2) continue
    const ids = names.map((n) => slug(n)) as [string, string]
    const division = r.WEIGHTCLASS.replace(/^UFC\s+/, '').replace(/\s*(Title\s*)?Bout$/, '').trim()
    names.forEach((n, i) => {
      if (!competitors.has(ids[i])) {
        const parts = n.split(' ')
        const nick = nicknames.get(n)
        competitors.set(ids[i], {
          id: ids[i], sport: 'ufc', kind: 'fighter', name: n,
          shortName: parts.length > 1 ? parts.slice(1).join(' ') : n,
          aliases: [parts.slice(1).join(' '), ...(nick ? [nick] : [])].filter(Boolean),
          colors: colorsFor(n),
        })
      }
      const c = competitors.get(ids[i])!
      c.subtitle = [nicknames.get(n) && `“${nicknames.get(n)}”`, division].filter(Boolean).join(' · ')
    })

    const [oa, ob] = r.OUTCOME.split('/')
    const m = method(r.METHOD)
    const before: [string, string] = [recStr(ids[0]), recStr(ids[1])]
    let result: MatchResult
    let winnerIdx = -1
    if (oa === 'W' || ob === 'W') {
      winnerIdx = oa === 'W' ? 0 : 1
      result = { outcome: 'win', winnerId: ids[winnerIdx], text: '' }
    } else if (oa === 'D') result = { outcome: 'draw', winnerId: null, text: 'Draw' }
    else result = { outcome: 'no-result', winnerId: null, text: `No contest${r.METHOD === 'Overturned' ? ' (result overturned)' : ''}` }

    // Update records
    ids.forEach((id, i) => {
      const rec = record.get(id) ?? { w: 0, l: 0, d: 0, nc: 0 }
      if (result.outcome === 'win') i === winnerIdx ? rec.w++ : rec.l++
      else if (result.outcome === 'draw') rec.d++
      else rec.nc++
      record.set(id, rec)
    })
    const after: [string, string] = [recStr(ids[0]), recStr(ids[1])]

    const isDecision = m.startsWith('Decision')
    let cards = isDecision || r.METHOD.startsWith('Decision') ? parseCards(r.DETAILS) : []
    let cardsOriented = true
    if (cards.length && winnerIdx >= 0) {
      // Orient cards so the majority favour the official winner.
      const favour = cards.filter((c) => c.scores[winnerIdx] > c.scores[1 - winnerIdx]).length
      const against = cards.filter((c) => c.scores[winnerIdx] < c.scores[1 - winnerIdx]).length
      if (against > favour) cards = cards.map((c) => ({ ...c, scores: [c.scores[1], c.scores[0]] }))
    } else if (cards.length) cardsOriented = false

    const timeLabel = `R${r.ROUND} ${r.TIME}`
    const detailText = !isDecision && r.DETAILS ? r.DETAILS : undefined
    if (result.outcome === 'win') {
      const how = isDecision
        ? `${m.replace('Decision (', '').replace(')', '')} decision${cards.length ? ` (${cards.map((c) => `${c.scores[winnerIdx]}–${c.scores[1 - winnerIdx]}`).join(', ')})` : ''}`
        : `${m}${detailText ? ` (${detailText})` : ''}, ${timeLabel}`
      result.text = `${names[winnerIdx]} def. ${names[1 - winnerIdx]} — ${how}`
    }

    const date = r.date
    const event = events.get(r.EVENT)
    const loc = (event?.LOCATION ?? '').split(',').map((s) => s.trim())
    const id = `ufc-${r.URL.split('/').pop()}`
    const summary: MatchSummary = {
      id,
      sport: 'ufc',
      date,
      competition: r.EVENT,
      stage: `${division}${/Title/.test(r.WEIGHTCLASS) ? ' · Title fight' : ''}`,
      venue: { city: loc[0], country: loc.at(-1) },
      competitorIds: ids,
      score: null,
      result,
      source: { provider: 'UFCStats.com (via scrape_ufc_stats)', isDemo: false, url: r.URL },
      hasDetail: true,
    }
    summaries.push(summary)

    // Round-by-round stats
    const rows = statsByBout.get(`${r.EVENT}|${r.BOUT}`) ?? []
    const roundNums = [...new Set(rows.map((x) => Number(x.ROUND.replace(/\D/g, ''))))].filter(Boolean).sort((a, b) => a - b)
    const rounds: RoundStats[] = roundNums.map((rn) => ({
      round: rn,
      fighters: names.map((n) => {
        const x = rows.find((y) => Number(y.ROUND.replace(/\D/g, '')) === rn && y.FIGHTER === n)
        if (!x) return {}
        return {
          knockdowns: num(x.KD), sigStrikes: att(x['SIG.STR.']), totalStrikes: att(x['TOTAL STR.']), takedowns: att(x.TD),
          submissionAttempts: num(x['SUB.ATT']), reversals: num(x['REV.']), controlTime: ctrl(x.CTRL),
          head: att(x.HEAD), body: att(x.BODY), leg: att(x.LEG), distance: att(x.DISTANCE), clinch: att(x.CLINCH), ground: att(x.GROUND),
        } satisfies FighterFightStats
      }) as [FighterFightStats, FighterFightStats],
    }))

    // Timeline moments: per-round counts (the source has no timestamps inside rounds) + the official finish.
    const moments: UFCKeyMoment[] = []
    for (const rd of rounds) {
      rd.fighters.forEach((f, i) => {
        if (f.knockdowns) moments.push({ round: rd.round, type: 'knockdown', fighterId: ids[i], text: `${names[i]} scores ${f.knockdowns} knockdown${f.knockdowns > 1 ? 's' : ''} in round ${rd.round}.`, major: true })
        if (f.takedowns?.landed) moments.push({ round: rd.round, type: 'takedown', fighterId: ids[i], text: `${names[i]} lands ${f.takedowns.landed} of ${f.takedowns.attempted} takedown attempts in round ${rd.round}.` })
        if (f.submissionAttempts) moments.push({ round: rd.round, type: 'submission-attempt', fighterId: ids[i], text: `${names[i]} attempts ${f.submissionAttempts} submission${f.submissionAttempts > 1 ? 's' : ''} in round ${rd.round}.` })
      })
    }
    if (result.outcome === 'win' && !isDecision) {
      moments.push({ round: Number(r.ROUND), time: r.TIME, type: 'finish', fighterId: ids[winnerIdx], text: `${m}${detailText ? ` — ${detailText}` : ''}. ${names[winnerIdx]} wins.`, major: true })
    }

    const fmt = r['TIME FORMAT'].match(/^(\d+) Rnd/)
    const stats: UFCStats = {
      event: r.EVENT,
      weightClass: division,
      titleFight: /Title/.test(r.WEIGHTCLASS),
      scheduledRounds: fmt ? Number(fmt[1]) : null,
      method: result.outcome === 'draw' ? 'Draw' : m,
      methodDetail: detailText,
      endRound: Number(r.ROUND),
      endTime: r.TIME,
      referee: r.REFEREE || undefined,
      totals: rounds.length ? [sumRounds(rounds.map((x) => x.fighters[0])), sumRounds(rounds.map((x) => x.fighters[1]))] : [{}, {}],
      rounds: rounds.length ? rounds : undefined,
      scorecards: cards.length ? cards.map((c) => (cardsOriented ? c : { ...c, judge: `${c.judge} (order as published)` })) : undefined,
      records: { before, after },
      keyMoments: moments,
    }
    details.set(id, { ...summary, sport: 'ufc', stats })
  }
  writeDataset('ufc', [...competitors.values()], summaries, details)
}
