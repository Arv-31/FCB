import type {
  CricketMatchDetail, FootballMatchDetail, MatchDetail, TimelineEvent, UFCMatchDetail,
} from '@/types'
import { aOrAn, cleanName, clockToSeconds, minuteLabel, oversToBalls } from '@/utils/format'

export type NameOf = (competitorId: string) => string

/**
 * Builds the visual timeline purely from structured source data
 * (fall of wickets, goal/card/sub events, recorded fight moments).
 * Nothing is inferred or invented here.
 */
export function buildTimeline(detail: MatchDetail, nameOf: NameOf): TimelineEvent[] {
  switch (detail.sport) {
    case 'cricket': return cricketTimeline(detail, nameOf)
    case 'football': return footballTimeline(detail, nameOf)
    case 'ufc': return ufcTimeline(detail, nameOf)
  }
}

const INNINGS_SPAN = 10_000

const MOMENT_TITLE: Record<string, string> = {
  six: 'SIX', four: 'FOUR', milestone: 'Milestone', review: 'Review', wicket: 'Bowling milestone', note: 'Key moment',
}

function cricketTimeline(d: CricketMatchDetail, nameOf: NameOf): TimelineEvent[] {
  const events: TimelineEvent[] = []
  d.stats.innings.forEach((inn, i) => {
    const base = i * INNINGS_SPAN
    const team = nameOf(inn.battingTeamId)
    events.push({
      marker: `Innings ${i + 1}`,
      order: base,
      type: 'start',
      title: `${team} batting`,
      description: inn.target ? `Target: ${inn.target}${inn.maxOvers ? ` from ${inn.maxOvers} overs` : ''}.` : undefined,
      competitorId: inn.battingTeamId,
    })

    inn.fallOfWickets?.forEach((f) => {
      const entry = inn.batting?.find((b) => cleanName(b.name) === f.batter)
      const broken = inn.partnerships?.find((p) => p.wicket === f.wicket)
      const details = [
        entry ? `${entry.dismissal}, ${entry.runs} (${entry.balls}).` : '',
        `${team} ${f.score}/${f.wicket}.`,
        broken && broken.runs >= 50 ? `Ends ${aOrAn(broken.runs)} ${broken.runs}-run partnership.` : '',
      ]
      events.push({
        marker: `${f.over} ov`,
        order: base + oversToBalls(f.over),
        type: 'wicket',
        title: `Wicket — ${f.batter}`,
        description: details.filter(Boolean).join(' '),
        competitorId: inn.battingTeamId,
        major: !!broken && broken.runs >= 50,
      })
    })

    d.stats.keyMoments
      // Tests: a team bats twice, so moments carry their innings index when known.
      ?.filter((k) => (k.innings !== undefined ? k.innings === i : k.teamId === inn.battingTeamId))
      .forEach((k) => {
        events.push({
          marker: `${k.over} ov`,
          order: base + oversToBalls(k.over) + 0.5,
          type: k.type,
          title: MOMENT_TITLE[k.type],
          description: k.text,
          competitorId: k.teamId,
          major: k.major,
        })
      })

    const last = i === d.stats.innings.length - 1
    events.push({
      marker: `${inn.overs} ov`,
      order: base + oversToBalls(inn.overs) + 0.9,
      type: last ? 'end' : 'innings-break',
      title: `${team} ${inn.runs}${inn.wickets < 10 ? `/${inn.wickets}${inn.declared ? 'd' : ''}` : ''}`,
      description: last ? d.result.text : inn.declared ? 'Innings declared.' : 'End of innings.',
      competitorId: inn.battingTeamId,
      major: last,
    })
  })
  return events.sort((a, b) => a.order - b.order)
}

function footballTimeline(d: FootballMatchDetail, nameOf: NameOf): TimelineEvent[] {
  const [home, away] = d.competitorIds
  const s = d.stats
  const events: TimelineEvent[] = [{ marker: "0'", order: 0, type: 'start', title: 'Kick-off' }]
  const at = (minute: number, added = 0) => minute + added / 100

  const score = [0, 0]
  const goals = [...s.goals].sort((a, b) => at(a.minute, a.addedTime) - at(b.minute, b.addedTime))
  goals.forEach((g, idx) => {
    const side = g.teamId === home ? 0 : 1
    const before = [...score]
    score[side]++
    const team = nameOf(g.teamId)
    const isLastGoal = idx === goals.length - 1
    let swing: string
    if (before[0] === before[1]) swing = `${team} take the lead.`
    else if (before[side] + 1 === before[1 - side]) swing = `${team} equalise.`
    else if (before[side] > before[1 - side]) swing = `${team} extend the lead.`
    else swing = `${team} pull one back.`
    if (isLastGoal && d.result.winnerId === g.teamId && score[side] - score[1 - side] === 1) swing = `${team} score the winner.`

    const kind = g.kind === 'penalty' ? ' (penalty)' : g.kind === 'own-goal' ? ' (own goal)' : g.kind === 'header' ? ' (header)' : g.kind === 'free-kick' ? ' (free kick)' : ''
    events.push({
      marker: minuteLabel(g.minute, g.addedTime),
      order: at(g.minute, g.addedTime),
      type: g.kind === 'penalty' ? 'penalty-goal' : g.kind === 'own-goal' ? 'own-goal' : 'goal',
      title: `Goal — ${nameOf(home)} ${score[0]}–${score[1]} ${nameOf(away)}`,
      description: `${g.scorer}${kind}${g.assist ? `, assisted by ${g.assist}` : ''}. ${swing}`,
      competitorId: g.teamId,
      major: true,
    })
  })

  s.cards?.forEach((c) => {
    const red = c.card !== 'yellow'
    events.push({
      marker: minuteLabel(c.minute, c.addedTime),
      order: at(c.minute, c.addedTime) + 0.001,
      type: red ? 'red' : 'yellow',
      title: red ? (c.card === 'second-yellow' ? 'Red card (second yellow)' : 'Red card') : 'Yellow card',
      description: `${c.player} (${nameOf(c.teamId)})${red ? ` — ${nameOf(c.teamId)} down to ten men.` : ''}`,
      competitorId: c.teamId,
      major: red,
    })
  })

  s.substitutions?.forEach((sub) => {
    events.push({
      marker: minuteLabel(sub.minute),
      order: at(sub.minute) + 0.002,
      type: 'substitution',
      title: 'Substitution',
      description: `${nameOf(sub.teamId)}: ${sub.playerOn} on for ${sub.playerOff}.`,
      competitorId: sub.teamId,
    })
  })

  if (s.halfTime) {
    events.push({ marker: 'HT', order: 45.99, type: 'note', title: `Half-time ${s.halfTime[0]}–${s.halfTime[1]}` })
  }
  events.push({ marker: 'FT', order: 200, type: 'end', title: `Full-time ${s.fullTime[0]}–${s.fullTime[1]}`, description: d.result.text, major: true })
  return events.sort((a, b) => a.order - b.order)
}

function ufcTimeline(d: UFCMatchDetail, nameOf: NameOf): TimelineEvent[] {
  const s = d.stats
  // Moments without a timestamp are per-round counts; they sit at the start of their round.
  const order = (round: number, time?: string) => (round - 1) * 300 + (time ? clockToSeconds(time) : 0.5)
  const events: TimelineEvent[] = [{
    marker: 'R1 0:00',
    order: 0,
    type: 'start',
    title: 'Fight begins',
    description: `${s.scheduledRounds ? `${s.scheduledRounds}-round ` : ''}${s.titleFight ? 'title fight' : 'bout'} at ${s.weightClass}.`,
  }]
  s.keyMoments?.forEach((k) => {
    const who = nameOf(k.fighterId)
    events.push({
      marker: k.time ? `R${k.round} ${k.time}` : `Round ${k.round}`,
      order: order(k.round, k.time),
      type: k.type,
      title: k.type === 'submission-attempt' ? 'Submission attempt' : k.type === 'finish' ? 'Finish' : k.type === 'note' ? 'Key moment' : k.type[0].toUpperCase() + k.type.slice(1),
      description: k.text.includes(who) ? k.text : `${who}: ${k.text}`,
      competitorId: k.fighterId,
      major: k.major,
    })
  })
  if (!s.keyMoments?.some((k) => k.type === 'finish')) {
    events.push({
      marker: `R${s.endRound} ${s.endTime}`,
      order: order(s.endRound, s.endTime) + 0.5,
      type: 'end',
      title: s.method.startsWith('Decision') ? 'Goes the distance' : 'Fight ends',
      description: d.result.text,
      competitorId: d.result.winnerId ?? undefined,
      major: true,
    })
  }
  return events.sort((a, b) => a.order - b.order)
}
