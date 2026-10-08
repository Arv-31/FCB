import type { UFCMatchDetail } from '@/types'
import { ordinal, venueText } from '@/utils/format'
import type { NameOf } from '../timeline/buildTimeline'

export function ufcNarrative(d: UFCMatchDetail, nameOf: NameOf): string[] {
  const s = d.stats
  const [aId, bId] = d.competitorIds
  const A = nameOf(aId)
  const B = nameOf(bId)
  const paras: string[] = []

  const where = venueText(d.venue)
  const p1 = [`${A} and ${B} met in a ${s.scheduledRounds ? `${s.scheduledRounds}-round ` : ''}${s.titleFight ? 'title fight' : 'bout'} at ${s.weightClass} on ${s.event}${where ? ` (${where})` : ''}.`]
  if (s.records?.before) p1.push(`${A} entered at ${s.records.before[0]} and ${B} at ${s.records.before[1]}.`)
  paras.push(p1.join(' '))

  const moments = s.keyMoments ?? []
  if (moments.length) {
    const byRound = new Map<number, string[]>()
    for (const k of moments) {
      const list = byRound.get(k.round) ?? []
      list.push(k.time ? `${k.text.replace(/\.$/, '')} (${k.time})` : k.text.replace(/ in round \d+\.?$/, '').replace(/\.$/, ''))
      byRound.set(k.round, list)
    }
    const p2 = [...byRound.entries()].map(([r, texts]) => `In the ${ordinal(r)} round: ${texts.join('; ')}.`)
    paras.push(p2.join(' '))
  } else {
    paras.push('A round-by-round account isn’t available from the current data source.')
  }

  const [ta, tb] = s.totals
  const p3: string[] = []
  const finish = s.method.startsWith('Decision')
    ? `The fight went the full ${s.endRound} rounds and was decided by ${s.method.replace('Decision (', '').replace(')', '').toLowerCase()} decision`
    : `The fight ended by ${s.method}${s.methodDetail ? ` (${s.methodDetail.toLowerCase()})` : ''} at ${s.endTime} of round ${s.endRound}`
  p3.push(`${finish}${d.result.winnerId ? `, in favour of ${nameOf(d.result.winnerId)}` : ''}.`)
  if (s.scorecards?.length) p3.push(`Judges’ cards: ${s.scorecards.map((c) => `${c.scores[0]}–${c.scores[1]}`).join(', ')} (${A} first).`)
  if (ta.sigStrikes && tb.sigStrikes) p3.push(`Significant strikes finished ${ta.sigStrikes.landed}–${tb.sigStrikes.landed}.`)
  if (ta.takedowns && tb.takedowns) p3.push(`Takedowns: ${A} ${ta.takedowns.landed}/${ta.takedowns.attempted}, ${B} ${tb.takedowns.landed}/${tb.takedowns.attempted}.`)
  if (ta.controlTime && tb.controlTime) p3.push(`Control time: ${ta.controlTime} vs ${tb.controlTime}.`)
  if (s.bonuses?.length) p3.push(`Bonus: ${s.bonuses.join(', ')}.`)
  paras.push(p3.join(' '))
  return paras
}
