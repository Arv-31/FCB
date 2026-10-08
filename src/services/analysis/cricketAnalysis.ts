import type { CricketMatchDetail, Innings, MatchAnalysis } from '@/types'
import { cleanName, fixed, oversToBalls, ordinal, plural, runRate, strikeRate } from '@/utils/format'
import { findCollapse, scoreText } from '../narrative/cricketNarrative'
import type { NameOf } from '../timeline/buildTimeline'

type Points = MatchAnalysis['points']

const extrasTotal = (inn: Innings) =>
  inn.extras ? inn.extras.byes + inn.extras.legByes + inn.extras.wides + inn.extras.noBalls : undefined
const boundaries = (inns: Innings[]) => ({
  fours: inns.reduce((s, i) => s + (i.batting?.reduce((t, b) => t + b.fours, 0) ?? 0), 0),
  sixes: inns.reduce((s, i) => s + (i.batting?.reduce((t, b) => t + b.sixes, 0) ?? 0), 0),
})

interface BatAgg { name: string; teamId: string; runs: number; balls: number; fours: number; sixes: number; notOutFinish: boolean }
interface BowlAgg { name: string; teamId: string; wickets: number; runs: number; balls: number }

/** Match aggregates per player (Tests: both innings combined). */
function aggregates(d: CricketMatchDetail) {
  const bat = new Map<string, BatAgg>()
  const bowl = new Map<string, BowlAgg>()
  const last = d.stats.innings.at(-1)
  for (const inn of d.stats.innings) {
    const fielding = d.competitorIds.find((c) => c !== inn.battingTeamId)!
    for (const b of inn.batting ?? []) {
      const key = `${inn.battingTeamId}|${cleanName(b.name)}`
      const a = bat.get(key) ?? { name: cleanName(b.name), teamId: inn.battingTeamId, runs: 0, balls: 0, fours: 0, sixes: 0, notOutFinish: false }
      a.runs += b.runs
      a.balls += b.balls
      a.fours += b.fours
      a.sixes += b.sixes
      if (inn === last && b.dismissal === 'not out') a.notOutFinish = true
      bat.set(key, a)
    }
    for (const b of inn.bowling ?? []) {
      const key = `${fielding}|${b.name}`
      const a = bowl.get(key) ?? { name: b.name, teamId: fielding, wickets: 0, runs: 0, balls: 0 }
      a.wickets += b.wickets
      a.runs += b.runs
      a.balls += oversToBalls(b.overs)
      bowl.set(key, a)
    }
  }
  return { bat: [...bat.values()], bowl: [...bowl.values()] }
}

export function analyzeCricket(d: CricketMatchDetail, nameOf: NameOf): Points {
  const { stats } = d
  const points: Points = {}
  const inns = stats.innings
  if (!inns.length || d.result.outcome === 'no-result') return points

  const isTest = stats.format === 'Test'
  const winnerId = d.result.winnerId
  const loserId = winnerId ? d.competitorIds.find((c) => c !== winnerId)! : undefined
  const teamInns = (id: string) => inns.filter((i) => i.battingTeamId === id)
  const last = inns.at(-1)!
  const chasedDown = !!winnerId && last.battingTeamId === winnerId && !isTest
  const hasScorecards = inns.every((i) => i.batting)
  const totals = (id: string) => teamInns(id).reduce((s, i) => ({ runs: s.runs + i.runs, wkts: s.wkts + i.wickets, balls: s.balls + oversToBalls(i.overs) }), { runs: 0, wkts: 0, balls: 0 })
  const totalLine = (id: string) => {
    const t = totals(id)
    return `${nameOf(id)}: ${teamInns(id).map(scoreText).join(' & ')}${isTest ? '' : ` (RR ${fixed((t.runs * 6) / Math.max(1, t.balls))})`}`
  }

  // ---- What decided it
  const evidence = d.competitorIds.map(totalLine)
  if (d.result.outcome === 'win' && winnerId) {
    let body: string
    if (chasedDown) {
      const left = last.maxOvers && !stats.method ? last.maxOvers * 6 - oversToBalls(last.overs) : 0
      body = `${nameOf(winnerId)} paced the chase of ${last.target ?? ''} with ${10 - last.wickets} wickets in hand${left > 0 ? ` and ${left} balls to spare` : ''}. Keeping wickets in the bank let them accelerate late without risk of being bowled out.`
    } else if (!isTest) {
      body = `${nameOf(winnerId)} defended ${inns[0].runs}: ${nameOf(last.battingTeamId)} finished on ${scoreText(last)}, and their run rate (${fixed(runRate(last.runs, last.overs))}) never matched what the target demanded.`
    } else {
      const w1 = teamInns(winnerId)[0]
      const l1 = loserId ? teamInns(loserId)[0] : undefined
      const lead = w1 && l1 ? w1.runs - l1.runs : 0
      body = `${nameOf(winnerId)} ${lead > 0 ? `gained a first-innings lead of ${lead} and ` : ''}took ${plural(totals(loserId!).wkts, 'wicket')} across the match to win ${d.result.text.replace(/^.*? won /, '')}.`
    }
    points.decider = { heading: 'What decided the match', body, evidence }
  } else if (d.result.outcome === 'draw') {
    points.decider = { heading: 'What decided the match', body: `Neither side could take enough wickets to force a result in the time available, so the match was drawn.`, evidence }
  } else if (d.result.outcome === 'tie') {
    points.decider = { heading: 'What decided the match', body: `The scores finished level. ${stats.superOvers?.length ? 'The match went to a Super Over.' : ''}`.trim(), evidence: [...evidence, ...(stats.superOvers ?? []).map((s) => `Super Over — ${nameOf(s.teamId)} ${s.runs}/${s.wickets}`)] }
  }

  if (!hasScorecards) {
    points.keyStats = {
      heading: 'Important statistics',
      body: 'Only innings totals are available for this match, so the analysis is limited to the scores. Player-level conclusions would require a full scorecard.',
      evidence,
    }
    return points
  }

  // ---- Turning point
  const loserCollapse = loserId
    ? teamInns(loserId).map((inn) => ({ inn, c: findCollapse(inn) })).filter((x) => x.c).sort((a, b) => b.c!.wickets - a.c!.wickets)[0]
    : undefined
  const standPool = winnerId ? teamInns(winnerId) : inns
  const bigStand = standPool.flatMap((inn) => (inn.partnerships ?? []).map((p) => ({ p, inn }))).sort((a, b) => b.p.runs - a.p.runs)[0]
  if (loserCollapse?.c && loserId) {
    const c = loserCollapse.c
    points.turningPoint = {
      heading: 'Biggest turning point',
      body: `${nameOf(loserId)} lost ${c.wickets} wickets for ${c.runs} runs between overs ${c.from} and ${c.to}${isTest ? ` in their ${ordinal(teamInns(loserId).indexOf(loserCollapse.inn) + 1)} innings` : ''}. That spell swung the match decisively.`,
      evidence: [`Score went from ${c.fromScore} to ${c.toScore}`],
    }
  } else if (bigStand && bigStand.p.runs >= 40) {
    const { p } = bigStand
    points.turningPoint = {
      heading: 'Biggest turning point',
      body: `The ${ordinal(p.wicket)}-wicket partnership of ${p.runs} between ${p.batters[0]} and ${p.batters[1]} was the most productive stand of the match${winnerId ? ` and swung it ${nameOf(winnerId)}’s way` : ''}.`,
      evidence: [`${p.runs} runs off ${p.balls} balls (${fixed((p.runs * 6) / Math.max(1, p.balls))} per over)`],
    }
  }

  // ---- Best performer
  const { bat, bowl } = aggregates(d)
  const pool = winnerId ? (x: { teamId: string }) => x.teamId === winnerId : () => true
  const teamSR = (id: string) => {
    const t = totals(id)
    return strikeRate(t.runs, t.balls)
  }
  const batScore = (b: BatAgg) => (isTest ? b.runs : b.runs * (0.7 + 0.3 * (strikeRate(b.runs, b.balls) / Math.max(1, teamSR(b.teamId)))))
  const bowlScore = (b: BowlAgg) => b.wickets * (isTest ? 20 : 22) + (isTest ? 0 : Math.max(0, 7 - (b.runs * 6) / Math.max(1, b.balls)) * 3)
  const topBat = bat.filter(pool).sort((a, b) => batScore(b) - batScore(a))[0]
  const topBowl = bowl.filter(pool).sort((a, b) => bowlScore(b) - bowlScore(a))[0]
  const potm = stats.playerOfTheMatch ? [`Official Player of the Match: ${stats.playerOfTheMatch.name}`] : []
  if (topBat && (!topBowl || batScore(topBat) >= bowlScore(topBowl))) {
    const sr = strikeRate(topBat.runs, topBat.balls)
    points.bestPerformer = {
      heading: 'Best performer',
      body: `${topBat.name} had the biggest influence with the bat, scoring ${topBat.runs} off ${topBat.balls}${isTest ? ' across the match' : ` — ${sr >= teamSR(topBat.teamId) ? 'faster' : 'slower'} than the team’s overall scoring rate`}${topBat.notOutFinish && chasedDown && topBat.teamId === winnerId ? ' — and was there at the finish' : ''}.`,
      evidence: [`${topBat.runs} off ${topBat.balls} (SR ${fixed(sr, 1)}), ${topBat.fours}×4, ${topBat.sixes}×6`, ...potm],
    }
  } else if (topBowl) {
    points.bestPerformer = {
      heading: 'Best performer',
      body: `${topBowl.name} was the most decisive contributor with the ball, taking ${plural(topBowl.wickets, 'wicket')}${isTest ? ' in the match' : ''}.`,
      evidence: [`${topBowl.wickets}/${topBowl.runs} from ${Math.floor(topBowl.balls / 6)}${topBowl.balls % 6 ? `.${topBowl.balls % 6}` : ''} overs (econ ${fixed((topBowl.runs * 6) / Math.max(1, topBowl.balls))})`, ...potm],
    }
  }

  // ---- Winning strategy
  if (winnerId) {
    const wi = teamInns(winnerId)
    const b = boundaries(wi)
    const ev = [`Boundaries: ${b.fours} fours, ${b.sixes} sixes`]
    const pp = wi[0]?.powerplay
    const oppPp = loserId ? teamInns(loserId)[0]?.powerplay : undefined
    if (pp && oppPp) ev.unshift(`Powerplay: ${pp.runs}/${pp.wickets} vs ${oppPp.runs}/${oppPp.wickets}`)
    if (stats.toss) ev.push(`Toss: ${nameOf(stats.toss.winnerId)} chose to ${stats.toss.decision}`)
    points.winningStrategy = {
      heading: 'Winning strategy',
      body: isTest
        ? `${nameOf(winnerId)} won the key sessions: they ${totals(winnerId).runs > totals(loserId!).runs ? 'outscored their opponents across the match' : 'bowled well enough to win despite scoring fewer runs overall'}.`
        : chasedDown
          ? `A measured chase: ${nameOf(winnerId)} built through partnerships and kept wickets in hand for the final overs.`
          : `Batting first, ${nameOf(winnerId)} set a total that put scoreboard pressure on the chase, then bowled with enough control to keep the required rate climbing.`,
      evidence: ev,
    }
  }

  // ---- Losing side problems
  if (loserId) {
    const li = teamInns(loserId)
    const top3 = li.flatMap((inn) => (inn.batting ?? []).slice(0, 3))
    const oppInns = teamInns(winnerId!)
    const conceded = oppInns.reduce((s, i) => s + (extrasTotal(i) ?? 0), 0)
    const ev = [`Top three combined: ${top3.reduce((s, b) => s + b.runs, 0)} runs${isTest ? ' across both innings' : ''}`, `Extras conceded in the field: ${conceded}`]
    points.losingProblems = {
      heading: `${nameOf(loserId)}’s problems`,
      body: loserCollapse?.c
        ? `Wickets fell in a cluster (${loserCollapse.c.wickets} for ${loserCollapse.c.runs}), and ${nameOf(loserId)} could not rebuild with the partnership the situation needed.`
        : `${nameOf(loserId)} were competitive but fell short; no batter could build the decisive innings.`,
      evidence: ev,
    }
  }

  // ---- Tactical choices
  const tactics: string[] = []
  if (stats.toss) tactics.push(`${nameOf(stats.toss.winnerId)} won the toss and chose to ${stats.toss.decision}.`)
  for (const inn of inns.filter((i) => i.declared)) tactics.push(`${nameOf(inn.battingTeamId)} declared at ${inn.runs}/${inn.wickets}.`)
  if (!isTest) {
    for (const inn of inns) {
      if (!inn.bowling) continue
      const fielding = d.competitorIds.find((c) => c !== inn.battingTeamId)!
      tactics.push(`${nameOf(fielding)} used ${inn.bowling.length} bowlers.`)
    }
  }
  if (tactics.length) points.tacticalChanges = { heading: 'Tactical choices', body: tactics.join(' ') }

  const ks = d.competitorIds.map((id) => {
    const b = boundaries(teamInns(id))
    const t = totals(id)
    return `${nameOf(id)}: ${t.runs} runs for ${t.wkts} wickets${isTest ? '' : ` at ${fixed((t.runs * 6) / Math.max(1, t.balls))} an over`}, ${b.fours}×4 / ${b.sixes}×6`
  })
  const big = bigStand ? [`Highest partnership: ${bigStand.p.runs} (${bigStand.p.batters.join(' & ')})`] : []
  points.keyStats = { heading: 'Important statistics', body: 'Match totals by team.', evidence: [...ks, ...big] }
  return points
}
