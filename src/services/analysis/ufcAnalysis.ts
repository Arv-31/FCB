import type { MatchAnalysis, UFCMatchDetail } from '@/types'
import { clockToSeconds, joinList, pct, plural } from '@/utils/format'
import type { NameOf } from '../timeline/buildTimeline'

type Points = MatchAnalysis['points']

export function analyzeUFC(d: UFCMatchDetail, nameOf: NameOf): Points {
  const s = d.stats
  const points: Points = {}
  const winnerId = d.result.winnerId
  if (!winnerId) return points
  const w = d.competitorIds.indexOf(winnerId)
  const l = 1 - w
  const loserId = d.competitorIds[l]
  const W = nameOf(winnerId)
  const L = nameOf(loserId)
  const tw = s.totals[w]
  const tl = s.totals[l]

  const decision = s.method.startsWith('Decision')
  points.decider = {
    heading: 'What decided the fight',
    body: decision
      ? `${W} won enough rounds on the cards through consistent volume and control, without needing a finish.`
      : `${W} found the finish — ${s.method}${s.methodDetail ? ` (${s.methodDetail})` : ''} at ${s.endTime} of round ${s.endRound}.`,
    evidence: [
      ...(s.scorecards?.map((c) => `${c.judge}: ${c.scores[w]}–${c.scores[l]}`) ?? []),
      `Ended R${s.endRound} ${s.endTime}`,
    ],
  }

  const major = s.keyMoments?.filter((k) => k.major) ?? []
  const firstKd = s.keyMoments?.find((k) => k.type === 'knockdown')
  const turning = firstKd ?? major[0]
  if (turning) {
    points.turningPoint = {
      heading: 'Biggest turning point',
      body: `Round ${turning.round}${turning.time ? `, ${turning.time}` : ""}: ${turning.text}`,
      evidence: major.map((k) => `R${k.round}${k.time ? ` ${k.time}` : ""} — ${nameOf(k.fighterId)}`),
    }
  }

  const ev: string[] = []
  if (tw.sigStrikes) ev.push(`Significant strikes ${tw.sigStrikes.landed}/${tw.sigStrikes.attempted} (${pct(tw.sigStrikes.landed, tw.sigStrikes.attempted)}%)`)
  if (tw.takedowns) ev.push(`Takedowns ${tw.takedowns.landed}/${tw.takedowns.attempted}`)
  if (tw.controlTime) ev.push(`Control time ${tw.controlTime}`)
  if (tw.knockdowns) ev.push(`Knockdowns ${tw.knockdowns}`)
  points.bestPerformer = {
    heading: 'Best performer',
    body: decision
      ? `${W} was the more effective fighter across the distance, winning the majority of rounds on the judges’ cards.`
      : `${W} produced the decisive moment — the finish — after ${s.endRound === 1 ? 'less than one round' : `${s.endRound - 1} full round${s.endRound === 2 ? '' : 's'}`} of action.`,
    evidence: ev,
  }

  const ctrlW = clockToSeconds(tw.controlTime ?? '0:00')
  const grappling = (tw.takedowns?.landed ?? 0) >= 2 || ctrlW >= 180
  points.winningStrategy = {
    heading: 'Winning strategy',
    body: grappling
      ? `${W} mixed striking with wrestling. Takedowns and top control limited ${L}’s offence and banked rounds.`
      : s.method === 'Submission'
        ? `${W} capitalised on a scramble: patience in transitions created the opening for the submission.`
        : `${W} won the striking exchanges, landing more significant strikes at better accuracy.`,
    evidence: ev.slice(0, 3),
  }

  const problems: string[] = []
  const lev: string[] = []
  if (tw.takedowns && tw.takedowns.attempted > 0) {
    const tdd = 100 - pct(tw.takedowns.landed, tw.takedowns.attempted)
    lev.push(`Takedown defence ${tdd}%`)
    if (tdd < 60) problems.push('could not keep the fight standing')
  }
  if (tl.sigStrikes && tw.sigStrikes && tl.sigStrikes.landed < tw.sigStrikes.landed) {
    problems.push('was out-landed on the feet')
    lev.push(`Sig. strikes ${tl.sigStrikes.landed} vs ${tw.sigStrikes.landed}`)
  }
  if ((tl.submissionAttempts ?? 0) > 0) {
    problems.push(`attempted ${plural(tl.submissionAttempts ?? 0, 'submission')} without converting`)
    lev.push(`Submission attempts ${tl.submissionAttempts}`)
  }
  points.losingProblems = {
    heading: `${L}’s problems`,
    body: problems.length ? `${L} ${joinList(problems)}.` : `${L} was competitive throughout but lost the decisive exchange.`,
    evidence: lev,
  }

  if (s.rounds && s.rounds.length > 1) {
    const lines = s.rounds.map((r) => {
      const a = r.fighters[w]
      const b = r.fighters[l]
      const diff = (a.sigStrikes?.landed ?? 0) - (b.sigStrikes?.landed ?? 0)
      return `R${r.round}: sig. strikes ${a.sigStrikes?.landed ?? '—'}–${b.sigStrikes?.landed ?? '—'} (${diff >= 0 ? '+' : ''}${diff}), takedowns ${a.takedowns?.landed ?? 0}–${b.takedowns?.landed ?? 0}, control ${a.controlTime ?? '—'}`
    })
    const lostRound = s.rounds.find((r) => (r.fighters[l].sigStrikes?.landed ?? 0) > (r.fighters[w].sigStrikes?.landed ?? 0))
    const after = lostRound ? s.rounds.find((r) => r.round === lostRound.round + 1) : undefined
    points.tacticalChanges = {
      heading: 'Tactical changes',
      body: lostRound && after
        ? `${L} had their best spell in round ${lostRound.round}. ${W} responded in round ${after.round} by going back to wrestling (${after.fighters[w].takedowns?.landed ?? 0} takedowns, ${after.fighters[w].controlTime ?? '—'} control).`
        : `${W} kept a consistent approach across rounds.`,
      evidence: lines,
    }
  }

  const ks: string[] = []
  if (tw.sigStrikes && tl.sigStrikes) ks.push(`Sig. strikes: ${W} ${tw.sigStrikes.landed} – ${tl.sigStrikes.landed} ${L}`)
  if (tw.totalStrikes && tl.totalStrikes) ks.push(`Total strikes: ${tw.totalStrikes.landed} – ${tl.totalStrikes.landed}`)
  if (tw.controlTime && tl.controlTime) ks.push(`Control: ${tw.controlTime} – ${tl.controlTime}`)
  points.keyStats = { heading: 'Important statistics', body: `${W} figures listed first.`, evidence: ks }
  return points
}
