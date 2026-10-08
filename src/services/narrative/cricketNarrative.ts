import type { CricketMatchDetail, Innings } from '@/types'
import { aOrAn, cleanName, fixed, oversToBalls, ordinal, runRate } from '@/utils/format'
import type { NameOf } from '../timeline/buildTimeline'

export const scoreText = (inn: Innings) =>
  inn.forfeited ? 'forfeited' : `${inn.runs}${inn.wickets >= 10 ? ' all out' : `/${inn.wickets}${inn.declared ? ' declared' : ''}`}`

/** Largest cluster of wickets that fell for few runs (min 3 wickets, ≤10 runs per wicket). */
export function findCollapse(inn: Innings): { wickets: number; runs: number; from: string; to: string; fromScore: number; toScore: number } | null {
  const fow = inn.fallOfWickets
  if (!fow || fow.length < 3) return null
  let best: ReturnType<typeof findCollapse> = null
  for (let i = 0; i < fow.length; i++) {
    for (let j = i + 2; j < fow.length; j++) {
      const startScore = i === 0 ? 0 : fow[i - 1].score
      const runs = fow[j].score - startScore
      const wickets = j - i + 1
      if (runs <= 10 * wickets && (!best || wickets > best.wickets || (wickets === best.wickets && runs < best.runs))) {
        best = { wickets, runs, from: fow[i].over, to: fow[j].over, fromScore: startScore, toScore: fow[j].score }
      }
    }
  }
  return best
}

export function topBatters(inn: Innings, n = 2) {
  return [...(inn.batting ?? [])].sort((a, b) => b.runs - a.runs || a.balls - b.balls).slice(0, n)
}

export function bestBowler(inn: Innings) {
  return [...(inn.bowling ?? [])].sort((a, b) => b.wickets - a.wickets || a.runs - b.runs)[0]
}

/** One paragraph describing a single innings. */
function inningsParagraph(d: CricketMatchDetail, inn: Innings, idx: number, nameOf: NameOf): string {
  const { stats } = d
  const team = nameOf(inn.battingTeamId)
  const fielding = nameOf(d.competitorIds.find((c) => c !== inn.battingTeamId) ?? '')
  const isTest = stats.format === 'Test'
  const p: string[] = []

  if (inn.forfeited) return `${team} forfeited their innings.`
  const chasing = !!inn.target && idx === stats.innings.length - 1
  const lead = idx === 0 ? `${team} batted first` : chasing ? `Chasing ${inn.target}, ${team}` : `${team} batted${isTest ? ` for the ${ordinal(stats.innings.filter((x, i) => i <= idx && x.battingTeamId === inn.battingTeamId).length)} time` : ''}`
  const verb = idx === 0 ? 'and made' : chasing ? 'finished on' : 'and made'
  p.push(`${lead} ${verb} ${scoreText(inn)} in ${inn.overs} overs${isTest ? '' : ` (run rate ${fixed(runRate(inn.runs, inn.overs))})`}.`)
  if (inn.powerplay && !isTest) p.push(`The powerplay (${inn.powerplay.label.toLowerCase()}) produced ${inn.powerplay.runs}/${inn.powerplay.wickets}.`)

  const tb = topBatters(inn)
  if (tb.length && tb[0].runs > 0) {
    const t = tb[0]
    p.push(`${cleanName(t.name)} top-scored with ${t.runs}${t.dismissal === 'not out' ? '*' : ''} off ${t.balls} balls${tb[1] && tb[1].runs > 0 ? `, supported by ${cleanName(tb[1].name)} (${tb[1].runs} off ${tb[1].balls})` : ''}.`)
  }
  const stand = [...(inn.partnerships ?? [])].sort((a, b) => b.runs - a.runs)[0]
  if (stand && stand.runs >= 50) p.push(`The biggest partnership was ${aOrAn(stand.runs)} ${stand.runs}-run ${ordinal(stand.wicket)}-wicket stand between ${stand.batters[0]} and ${stand.batters[1]}.`)
  const collapse = findCollapse(inn)
  if (collapse) p.push(`${collapse.wickets} wickets fell for ${collapse.runs} runs (from ${collapse.fromScore} to ${collapse.toScore}) between overs ${collapse.from} and ${collapse.to}.`)
  const bb = bestBowler(inn)
  if (bb && bb.wickets > 0) p.push(`For ${fielding}, ${bb.name} took ${bb.wickets}/${bb.runs} from ${bb.overs} overs.`)
  for (const k of stats.keyMoments ?? []) {
    const belongs = k.innings !== undefined ? k.innings === idx : k.teamId === inn.battingTeamId
    if (belongs && k.major && k.type !== 'milestone') p.push(`At ${k.over} overs: ${k.text}`)
  }
  if (!inn.batting) p.push('A detailed scorecard for this innings isn’t available from the current data source.')
  return p.join(' ')
}

export function cricketNarrative(d: CricketMatchDetail, nameOf: NameOf): string[] {
  const { stats } = d
  if (!stats.innings.length) return ['No innings were recorded for this match in the current data source.']

  const paras: string[] = []
  const toss = stats.toss ? `${nameOf(stats.toss.winnerId)} won the toss and chose to ${stats.toss.decision} first. ` : ''
  stats.innings.forEach((inn, i) => paras.push((i === 0 ? toss : '') + inningsParagraph(d, inn, i, nameOf)))

  // How it ended
  const end: string[] = [`${d.result.text}.`]
  const last = stats.innings.at(-1)!
  if (d.result.outcome === 'win' && last.battingTeamId === d.result.winnerId && last.maxOvers && !stats.method) {
    const left = last.maxOvers * 6 - oversToBalls(last.overs)
    if (left > 0) end.push(`The winning runs came with ${left} ball${left === 1 ? '' : 's'} to spare and ${10 - last.wickets} wickets in hand.`)
  }
  if (stats.superOvers?.length) {
    end.push(`Super Over: ${stats.superOvers.map((s) => `${nameOf(s.teamId)} ${s.runs}/${s.wickets}`).join(', ')}.`)
  }
  if (stats.method) end.push(`The result was decided using the ${stats.method === 'D/L' ? 'DLS' : stats.method} method after an interruption.`)
  if (stats.playerOfTheMatch) end.push(`${stats.playerOfTheMatch.name} (${nameOf(stats.playerOfTheMatch.teamId)}) was named Player of the Match.`)
  paras.push(end.join(' '))
  return paras
}
