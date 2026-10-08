import type { FootballMatchDetail, GoalEvent, MatchAnalysis } from '@/types'
import { minuteLabel, plural } from '@/utils/format'
import type { NameOf } from '../timeline/buildTimeline'

type Points = MatchAnalysis['points']
const t = (g: { minute: number; addedTime?: number }) => g.minute + (g.addedTime ?? 0) / 100

export function analyzeFootball(d: FootballMatchDetail, nameOf: NameOf): Points {
  const [home, away] = d.competitorIds
  const s = d.stats
  const points: Points = {}
  const goals = [...s.goals].sort((a, b) => t(a) - t(b))
  const side = (id: string) => (id === home ? 0 : 1)
  const winnerId = d.result.winnerId
  const loserId = winnerId ? (winnerId === home ? away : home) : undefined
  const ts = s.teamStats

  // Decisive goal: the goal after which the winner led for good.
  let decisive: GoalEvent | undefined
  let lastLevelGoal: GoalEvent | undefined
  const score = [0, 0]
  for (const g of goals) {
    score[side(g.teamId)]++
    if (winnerId && g.teamId === winnerId && score[side(winnerId)] === score[1 - side(winnerId)] + 1) decisive = g
    if (score[0] === score[1]) lastLevelGoal = g
  }

  if (winnerId && decisive) {
    points.decider = {
      heading: 'What decided the match',
      body: `${decisive.scorer}’s goal on ${minuteLabel(decisive.minute, decisive.addedTime)} put ${nameOf(winnerId)} ahead for good. ${nameOf(loserId!)} had no reply.`,
      evidence: [`Final score ${s.fullTime[0]}–${s.fullTime[1]}`, ...(s.halfTime ? [`Half-time ${s.halfTime[0]}–${s.halfTime[1]}`] : [])],
    }
  } else if (!winnerId) {
    points.decider = {
      heading: 'What decided the match',
      body: lastLevelGoal
        ? `Neither side could make an advantage stick. ${lastLevelGoal.scorer}’s equaliser on ${minuteLabel(lastLevelGoal.minute, lastLevelGoal.addedTime)} settled it as a draw.`
        : 'Neither side found a winner.',
      evidence: [`Final score ${s.fullTime[0]}–${s.fullTime[1]}`],
    }
  }

  // Turning point: a red card, else a goal from a substitute, else the decisive goal.
  const red = s.cards?.find((c) => c.card !== 'yellow')
  const subGoal = goals.find((g) => s.substitutions?.some((sub) => sub.playerOn === g.scorer || sub.playerOn === g.assist))
  if (red) {
    const after = goals.filter((g) => t(g) > red.minute)
    const benefit = after.filter((g) => g.teamId !== red.teamId).length
    points.turningPoint = {
      heading: 'Biggest turning point',
      body: `${red.player}’s dismissal on ${minuteLabel(red.minute, red.addedTime)} changed the game. ${nameOf(red.teamId)} played the rest with ten men, and the opposition scored ${benefit} goal${benefit === 1 ? '' : 's'} after it while ${nameOf(red.teamId)} managed ${after.length - benefit}.`,
      evidence: [`Red card: ${minuteLabel(red.minute, red.addedTime)}`, ...after.map((g) => `${minuteLabel(g.minute, g.addedTime)} ${g.scorer} (${nameOf(g.teamId)})`)],
    }
  } else if (subGoal) {
    const sub = s.substitutions!.find((x) => x.playerOn === subGoal.scorer || x.playerOn === subGoal.assist)!
    points.turningPoint = {
      heading: 'Biggest turning point',
      body: `The introduction of ${sub.playerOn} on ${minuteLabel(sub.minute)} paid off: ${sub.playerOn} ${sub.playerOn === subGoal.scorer ? 'scored' : 'set up'} the goal on ${minuteLabel(subGoal.minute, subGoal.addedTime)}.`,
      evidence: [`${sub.playerOn} on for ${sub.playerOff} (${minuteLabel(sub.minute)})`],
    }
  } else if (decisive) {
    points.turningPoint = { heading: 'Biggest turning point', body: `${decisive.scorer}’s goal on ${minuteLabel(decisive.minute, decisive.addedTime)} was the moment the match tilted.` }
  }

  // Best performer: goal involvements, winners first.
  const involvement = new Map<string, { goals: number; assists: number; teamId: string }>()
  for (const g of goals) {
    if (g.kind !== 'own-goal') {
      const e = involvement.get(g.scorer) ?? { goals: 0, assists: 0, teamId: g.teamId }
      e.goals++
      involvement.set(g.scorer, e)
    }
    if (g.assist) {
      const e = involvement.get(g.assist) ?? { goals: 0, assists: 0, teamId: g.teamId }
      e.assists++
      involvement.set(g.assist, e)
    }
  }
  // Score: goals + 0.75·assists, a bonus for the winning side; ties go to the official
  // player of the match, then to whoever was involved latest (the more decisive moment).
  const lastInvolvement = (name: string) => Math.max(...goals.filter((g) => g.scorer === name || g.assist === name).map(t))
  const impact = ([name, e]: [string, { goals: number; assists: number; teamId: string }]) =>
    e.goals + e.assists * 0.75 + (e.teamId === winnerId ? 0.5 : 0) + (s.playerOfTheMatch?.name === name ? 0.01 : 0) + lastInvolvement(name) / 1e6
  const ranked = [...involvement.entries()].sort((x, y) => impact(y) - impact(x))
  if (ranked[0]) {
    const [name, e] = ranked[0]
    points.bestPerformer = {
      heading: 'Best performer',
      body: `${name} (${nameOf(e.teamId)}) was the most decisive attacking player, directly involved in ${plural(e.goals + e.assists, 'goal')}.`,
      evidence: [`${plural(e.goals, 'goal')}, ${plural(e.assists, 'assist')}`, ...(s.playerOfTheMatch ? [`Official player of the match: ${s.playerOfTheMatch.name}`] : [])],
    }
  }

  // Strategy, using possession/shot/xG profile where available.
  if (ts?.possession && winnerId) {
    const w = side(winnerId)
    const l = 1 - w
    const evidence = [`Possession ${ts.possession[w]}% vs ${ts.possession[l]}%`]
    if (ts.shotsOnTarget) evidence.push(`Shots on target ${ts.shotsOnTarget[w]} vs ${ts.shotsOnTarget[l]}`)
    if (ts.xg) evidence.push(`xG ${ts.xg[w].toFixed(2)} vs ${ts.xg[l].toFixed(2)}`)
    const lessBall = ts.possession[w] < ts.possession[l]
    points.winningStrategy = {
      heading: 'Winning strategy',
      body: lessBall
        ? `${nameOf(winnerId)} won with less of the ball, which suggests a direct, transition-focused approach${ts.xg && ts.xg[w] > ts.xg[l] ? ': fewer passes but higher-quality chances (higher xG)' : ' and efficient finishing'}.`
        : `${nameOf(winnerId)} controlled possession and turned territorial dominance into${ts.xg && ts.xg[w] > ts.xg[l] ? ' better chances (higher xG)' : ' enough chances'}.`,
      evidence,
    }
  }

  if (loserId && ts) {
    const l = side(loserId)
    const evidence: string[] = []
    const issues: string[] = []
    if (ts.xg) {
      evidence.push(`xG ${ts.xg[l].toFixed(2)} → ${plural(s.fullTime[l], 'goal')}`)
      if (s.fullTime[l] < ts.xg[l] - 0.3) issues.push('Their finishing fell short of the chances they created.')
      if (ts.xg[l] < ts.xg[1 - l]) issues.push('They created lower-quality chances than their opponents (lower xG).')
    }
    if (ts.shots && ts.shotsOnTarget) {
      evidence.push(`${ts.shotsOnTarget[l]} of ${ts.shots[l]} shots on target`)
      if (ts.shotsOnTarget[l] / Math.max(1, ts.shots[l]) < 0.35) issues.push('Too few of their shots tested the goalkeeper.')
    }
    const lCards = s.cards?.filter((c) => c.teamId === loserId) ?? []
    if (lCards.some((c) => c.card !== 'yellow')) issues.push('A sending-off left them a player short.')
    if (lCards.length) evidence.push(plural(lCards.length, 'card'))
    points.losingProblems = {
      heading: `${nameOf(loserId)}’s problems`,
      body: issues.length ? issues.join(' ') : `${nameOf(loserId)} matched their opponents in most areas but conceded at decisive moments.`,
      evidence,
    }
  }

  if (s.substitutions?.length) {
    const lines = s.substitutions.map((sub) => {
      const contrib = goals.filter((g) => g.scorer === sub.playerOn || g.assist === sub.playerOn)
      return `${minuteLabel(sub.minute)} ${nameOf(sub.teamId)}: ${sub.playerOn} for ${sub.playerOff}${contrib.length ? ' (contributed to a goal)' : ''}`
    })
    const impactful = lines.filter((l) => l.includes('contributed')).length
    points.tacticalChanges = {
      heading: 'Tactical changes',
      body: impactful
        ? `Substitutions directly influenced the scoreline: ${impactful} change${impactful === 1 ? '' : 's'} led to goal involvement.`
        : 'Neither bench produced a direct goal contribution; changes were mainly like-for-like or for game management.',
      evidence: lines,
    }
  }

  if (ts) {
    const ev: string[] = []
    const add = (label: string, v?: [number, number], suffix = '') => v && ev.push(`${label}: ${v[0]}${suffix} – ${v[1]}${suffix}`)
    add('Shots', ts.shots)
    add('On target', ts.shotsOnTarget)
    add('Corners', ts.corners)
    add('Fouls', ts.fouls)
    if (ts.xg) ev.push(`xG: ${ts.xg[0].toFixed(2)} – ${ts.xg[1].toFixed(2)}`)
    points.keyStats = { heading: 'Important statistics', body: `${nameOf(home)} figures listed first.`, evidence: ev }
  }
  return points
}
