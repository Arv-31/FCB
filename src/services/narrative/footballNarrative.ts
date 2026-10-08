import type { FootballMatchDetail } from '@/types'
import { joinList, minuteLabel, ordinal } from '@/utils/format'
import type { NameOf } from '../timeline/buildTimeline'

export function footballNarrative(d: FootballMatchDetail, nameOf: NameOf): string[] {
  const [home, away] = d.competitorIds
  const s = d.stats
  const H = nameOf(home)
  const A = nameOf(away)
  const paras: string[] = []
  const goals = [...s.goals].sort((a, b) => a.minute + (a.addedTime ?? 0) / 100 - (b.minute + (b.addedTime ?? 0) / 100))
  const reds = s.cards?.filter((c) => c.card !== 'yellow') ?? []

  // First half
  const p1: string[] = [`${H} hosted ${A}${d.venue.name ? ` at ${d.venue.name}` : ''} in ${d.competition}.`]
  const firstHalf = goals.filter((g) => g.minute <= 45)
  if (goals.length === 0) p1.push('Neither side found the net.')
  else if (firstHalf.length === 0) p1.push('The first half was goalless.')
  else {
    const g = firstHalf[0]
    p1.push(`${g.scorer} opened the scoring for ${nameOf(g.teamId)} in the ${ordinal(g.minute)} minute${g.assist ? ` from ${g.assist}'s pass` : ''}${g.kind === 'penalty' ? ' from the penalty spot' : ''}.`)
    for (const later of firstHalf.slice(1)) {
      p1.push(`${later.scorer} replied for ${nameOf(later.teamId)} on ${minuteLabel(later.minute, later.addedTime)}.`)
    }
  }
  if (s.halfTime) p1.push(`It was ${s.halfTime[0]}–${s.halfTime[1]} at half-time.`)
  paras.push(p1.join(' '))

  // Second half
  const secondHalf = goals.filter((g) => g.minute > 45)
  const p2: string[] = []
  const events = [
    ...secondHalf.map((g) => ({ t: g.minute + (g.addedTime ?? 0) / 100, text: `${g.scorer} scored for ${nameOf(g.teamId)} on ${minuteLabel(g.minute, g.addedTime)}${g.kind === 'penalty' ? ' (penalty)' : g.kind === 'free-kick' ? ' (direct free kick)' : g.kind === 'header' ? ' with a header' : ''}${g.assist ? `, set up by ${g.assist}` : ''}.` })),
    ...reds.map((c) => ({ t: c.minute + 0.001, text: `${c.player} was sent off for ${nameOf(c.teamId)} on ${minuteLabel(c.minute, c.addedTime)}${c.card === 'second-yellow' ? ' after a second booking' : ''}.` })),
  ].sort((a, b) => a.t - b.t)
  for (const e of events) p2.push(e.text)
  const impactSubs = s.substitutions?.filter((sub) => goals.some((g) => (g.scorer === sub.playerOn || g.assist === sub.playerOn) && g.minute >= sub.minute)) ?? []
  for (const sub of impactSubs) {
    const contrib = goals.filter((g) => g.scorer === sub.playerOn || g.assist === sub.playerOn)
    p2.push(`Substitute ${sub.playerOn} (on ${minuteLabel(sub.minute)}) made an impact with ${contrib.map((g) => (g.scorer === sub.playerOn ? 'a goal' : 'an assist')).join(' and ')}.`)
  }
  if (p2.length) paras.push(p2.join(' '))

  // Result and stats context
  const p3: string[] = [`Final score: ${H} ${s.fullTime[0]}–${s.fullTime[1]} ${A}. ${d.result.text}.`]
  const ts = s.teamStats
  if (ts) {
    const bits: string[] = []
    if (ts.possession) bits.push(`possession ${ts.possession[0]}%–${ts.possession[1]}%`)
    if (ts.shots) bits.push(`shots ${ts.shots[0]}–${ts.shots[1]}`)
    if (ts.shotsOnTarget) bits.push(`shots on target ${ts.shotsOnTarget[0]}–${ts.shotsOnTarget[1]}`)
    if (ts.xg) bits.push(`expected goals ${ts.xg[0].toFixed(2)}–${ts.xg[1].toFixed(2)}`)
    if (bits.length) p3.push(`The numbers (${H} first): ${joinList(bits)}.`)
  } else {
    p3.push('Team statistics such as possession and shots aren’t available from the current data source.')
  }
  if (s.playerOfTheMatch) p3.push(`${s.playerOfTheMatch.name} (${nameOf(s.playerOfTheMatch.teamId)}) was named player of the match.`)
  paras.push(p3.join(' '))
  return paras
}
