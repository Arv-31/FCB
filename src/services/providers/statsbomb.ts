import type { CardEvent, FootballMatchDetail, FootballStats, GoalEvent, MatchSummary, Pair, SubstitutionEvent } from '@/types'

/**
 * Converts StatsBomb Open Data event + lineup files into FootballStats.
 * Every number is counted from the events; nothing is estimated except possession,
 * which StatsBomb does not publish directly and is flagged `possessionEstimated`.
 */

interface SbRef { id: number; name: string }
interface SbEvent {
  period: number
  minute: number
  second: number
  type: SbRef
  team: SbRef
  possession_team?: SbRef
  player?: SbRef
  duration?: number
  id: string
  tactics?: { lineup: { player: SbRef }[] }
  shot?: { outcome: SbRef; type: SbRef; body_part?: SbRef; statsbomb_xg?: number; key_pass_id?: string }
  pass?: { outcome?: SbRef; type?: SbRef; goal_assist?: boolean }
  foul_committed?: { card?: SbRef }
  bad_behaviour?: { card?: SbRef }
  substitution?: { replacement: SbRef }
}
interface SbLineup { team_id: number; lineup: { player_id: number; player_name: string; player_nickname: string | null }[] }

const BASE = 'https://raw.githubusercontent.com/statsbomb/open-data/master/data'
export const statsbombUrls = (matchId: number) => ({ events: `${BASE}/events/${matchId}.json`, lineups: `${BASE}/lineups/${matchId}.json` })

/** StatsBomb minutes are elapsed minutes; convert to the familiar 45+2 style. */
function displayMinute(period: number, minute: number): { minute: number; addedTime?: number } {
  const ends: Record<number, number> = { 1: 45, 2: 90, 3: 105, 4: 120 }
  const shown = minute + 1
  const end = ends[period]
  if (end && shown > end) return { minute: end, addedTime: shown - end }
  return { minute: shown }
}

/** Largest-remainder rounding so the two percentages always sum to 100. */
function percentPair(a: number, b: number): Pair {
  const total = a + b
  if (!total) return [50, 50]
  const pa = Math.round((a / total) * 100)
  return [pa, 100 - pa]
}

export function buildFootballStats(stub: MatchSummary & { referee?: string; managers?: [string | undefined, string | undefined] }, events: SbEvent[], lineups: SbLineup[]): FootballStats {
  const [home, away] = stub.competitorIds
  const sbId = (cid: string) => Number(cid.replace('fb-', ''))
  const side = (teamId: number) => (teamId === sbId(home) ? 0 : 1)
  const cid = (teamId: number) => (side(teamId) === 0 ? home : away)

  const nick = new Map<number, string>()
  for (const t of lineups) for (const p of t.lineup) nick.set(p.player_id, p.player_nickname || p.player_name)
  const name = (p?: SbRef) => (p ? nick.get(p.id) ?? p.name : 'Unknown')

  const byId = new Map(events.map((e) => [e.id, e]))
  const inPlay = events.filter((e) => e.period <= 4)

  const goals: GoalEvent[] = []
  const cards: CardEvent[] = []
  const subs: SubstitutionEvent[] = []
  const zero = (): Pair => [0, 0]
  const shots = zero(), onTarget = zero(), corners = zero(), fouls = zero(), offsides = zero(), passes = zero(), completed = zero(), poss = zero()
  const xg: Pair = [0, 0]
  const ht = zero()

  for (const e of inPlay) {
    const s = side(e.team.id)
    if (e.possession_team && e.duration) poss[side(e.possession_team.id)] += e.duration
    switch (e.type.name) {
      case 'Shot': {
        shots[s]++
        xg[s] += e.shot?.statsbomb_xg ?? 0
        const outcome = e.shot?.outcome.name
        if (outcome === 'Goal' || outcome === 'Saved' || outcome === 'Saved to Post') onTarget[s]++
        if (outcome === 'Goal') {
          const kp = e.shot?.key_pass_id ? byId.get(e.shot.key_pass_id) : undefined
          const t = e.shot?.type.name
          goals.push({
            ...displayMinute(e.period, e.minute),
            teamId: cid(e.team.id),
            scorer: name(e.player),
            assist: kp?.pass?.goal_assist ? name(kp.player) : undefined,
            kind: t === 'Penalty' ? 'penalty' : t === 'Free Kick' ? 'free-kick' : e.shot?.body_part?.name === 'Head' ? 'header' : 'open-play',
          })
          if (e.period === 1) ht[s]++
        }
        break
      }
      case 'Own Goal Against': {
        // Credited to the opposing team.
        goals.push({ ...displayMinute(e.period, e.minute), teamId: cid(e.team.id) === home ? away : home, scorer: name(e.player), kind: 'own-goal' })
        if (e.period === 1) ht[1 - s]++
        break
      }
      case 'Pass': {
        passes[s]++
        if (!e.pass?.outcome) completed[s]++
        if (e.pass?.type?.name === 'Corner') corners[s]++
        if (e.pass?.outcome?.name === 'Pass Offside') offsides[s]++
        break
      }
      case 'Offside':
        offsides[s]++
        break
      case 'Foul Committed':
        fouls[s]++
        break
      case 'Substitution':
        if (e.substitution) subs.push({ minute: displayMinute(e.period, e.minute).minute, teamId: cid(e.team.id), playerOff: name(e.player), playerOn: name(e.substitution.replacement) })
        break
    }
    const card = e.foul_committed?.card ?? e.bad_behaviour?.card
    if (card && e.player) {
      cards.push({
        ...displayMinute(e.period, e.minute),
        teamId: cid(e.team.id),
        player: name(e.player),
        card: card.name === 'Second Yellow' ? 'second-yellow' : card.name === 'Red Card' ? 'red' : 'yellow',
      })
    }
  }

  const shootout = events.filter((e) => e.period === 5 && e.type.name === 'Shot')
  const penaltyShootout: Pair | undefined = shootout.length
    ? [shootout.filter((e) => side(e.team.id) === 0 && e.shot?.outcome.name === 'Goal').length, shootout.filter((e) => side(e.team.id) === 1 && e.shot?.outcome.name === 'Goal').length]
    : undefined

  const lineup = (s: 0 | 1) => events.find((e) => e.type.name === 'Starting XI' && side(e.team.id) === s)?.tactics?.lineup.map((l) => name(l.player)) ?? []

  return {
    fullTime: [Number(stub.score?.[0] ?? 0), Number(stub.score?.[1] ?? 0)],
    halfTime: ht,
    goals,
    cards,
    substitutions: subs,
    teamStats: {
      possession: percentPair(poss[0], poss[1]),
      possessionEstimated: true,
      shots,
      shotsOnTarget: onTarget,
      xg: [Math.round(xg[0] * 100) / 100, Math.round(xg[1] * 100) / 100],
      corners,
      fouls,
      offsides,
      passes,
      passAccuracy: [passes[0] ? Math.round((completed[0] / passes[0]) * 100) : 0, passes[1] ? Math.round((completed[1] / passes[1]) * 100) : 0],
    },
    referee: stub.referee,
    managers: stub.managers,
    extraTime: events.some((e) => e.period === 3 || e.period === 4),
    penaltyShootout,
    lineups: { home: lineup(0), away: lineup(1) },
  }
}

/** Result text that reflects extra time and penalties, which the match list alone can't tell. */
export function refineFootballResult(d: FootballMatchDetail, nameOf: (id: string) => string): FootballMatchDetail {
  const s = d.stats
  const [h, a] = d.competitorIds
  if (s.penaltyShootout && s.fullTime[0] === s.fullTime[1]) {
    const [ph, pa] = s.penaltyShootout
    const winner = ph > pa ? h : a
    return { ...d, result: { ...d.result, text: `${nameOf(winner)} won ${Math.max(ph, pa)}–${Math.min(ph, pa)} on penalties (${s.fullTime[0]}–${s.fullTime[1]}${s.extraTime ? ' after extra time' : ''})` } }
  }
  if (s.fullTime[0] === s.fullTime[1]) {
    return { ...d, result: { ...d.result, text: `Draw ${s.fullTime[0]}–${s.fullTime[1]}${s.extraTime ? ' after extra time' : ''}` } }
  }
  if (s.extraTime) return { ...d, result: { ...d.result, text: `${d.result.text} after extra time` } }
  return d
}
