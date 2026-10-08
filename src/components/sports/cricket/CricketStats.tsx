import { useCallback, useState } from 'react'
import type { Competitor, CricketMatchDetail, Innings } from '@/types'
import { cleanName, fixed, ordinal, oversToBalls, runRate, strikeRate } from '@/utils/format'
import { InfoGrid, SubHeading, Table } from '../../ui/InfoGrid'
import { StatBar } from '../../ui/StatBar'
import { RunWorm } from './RunWorm'
import { NotAvailable } from '../../ui/States'

interface Props {
  detail: CricketMatchDetail
  get: (id: string) => Competitor | undefined
}

const total = (inn: Innings) => `${inn.runs}${inn.wickets < 10 ? `/${inn.wickets}` : ''}`
const extrasSum = (inn: Innings) => (inn.extras ? inn.extras.byes + inn.extras.legByes + inn.extras.wides + inn.extras.noBalls + ((inn.extras as { penalty?: number }).penalty ?? 0) : undefined)

export function CricketStats({ detail, get }: Props) {
  const { stats } = detail
  const [tab, setTab] = useState(0)
  const name = (id: string) => get(id)?.name ?? id
  const inn = stats.innings[tab]
  const [i1, i2] = stats.innings
  // Bars follow innings order (who batted first), not listing order.
  const colors = [i1, i2].map((inn) => (inn ? get(inn.battingTeamId)?.colors.primary : undefined) ?? '#888') as [string, string]
  // Per-innings comparisons only make sense when each side bats once.
  const limited = stats.format !== 'Test' && stats.innings.length === 2
  const wormLabel = useCallback((x: Innings) => get(x.battingTeamId)?.name ?? x.battingTeamId, [get])

  return (
    <div>
      <InfoGrid
        items={[
          { label: 'Format', value: stats.format },
          { label: 'Toss', value: stats.toss && `${name(stats.toss.winnerId)}, chose to ${stats.toss.decision}` },
          { label: 'Player of the Match', value: stats.playerOfTheMatch && `${stats.playerOfTheMatch.name} (${get(stats.playerOfTheMatch.teamId)?.shortName})` },
          { label: 'Result', value: detail.result.text },
          ...(stats.method ? [{ label: 'Method', value: stats.method === 'D/L' ? 'DLS' : stats.method }] : []),
          ...(stats.superOvers?.length ? [{ label: 'Super Over', value: stats.superOvers.map((s) => `${get(s.teamId)?.shortName ?? s.teamId} ${s.runs}/${s.wickets}`).join(' · ') }] : []),
          { label: 'Umpires', value: stats.officials?.join(', ') },
        ]}
      />

      {limited && i1?.runsPerOver?.length ? (
        <>
          <SubHeading>Run progression</SubHeading>
          <RunWorm innings={stats.innings} label={wormLabel} />
        </>
      ) : null}

      {limited && i1 && i2 && (
        <>
          <SubHeading>Innings comparison</SubHeading>
          <div className="flex justify-between text-xs font-semibold text-muted">
            <span>{name(i1.battingTeamId)}</span>
            <span>{name(i2.battingTeamId)}</span>
          </div>
          <StatBar label="Runs" values={[i1.runs, i2.runs]} colors={colors} />
          <StatBar label="Run rate" values={[runRate(i1.runs, i1.overs), runRate(i2.runs, i2.overs)]} format={(v) => fixed(v)} colors={colors} />
          <StatBar label="Wickets lost" values={[i1.wickets, i2.wickets]} colors={colors} lowerIsBetter />
          <StatBar label={`Powerplay runs`} values={i1.powerplay && i2.powerplay ? [i1.powerplay.runs, i2.powerplay.runs] : undefined} colors={colors} />
          <StatBar
            label="Boundaries (4s + 6s)"
            values={i1.batting && i2.batting ? [i1.batting.reduce((s, b) => s + b.fours + b.sixes, 0), i2.batting.reduce((s, b) => s + b.fours + b.sixes, 0)] : undefined}
            colors={colors}
          />
          <StatBar label="Extras received" values={i1.extras && i2.extras ? [extrasSum(i1)!, extrasSum(i2)!] : undefined} colors={colors} />
        </>
      )}

      <SubHeading>Scorecard</SubHeading>
      <div role="tablist" aria-label="Innings" className="mb-4 flex gap-2 overflow-x-auto">
        {stats.innings.map((x, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={tab === i}
            onClick={() => setTab(i)}
            className={`shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold transition ${tab === i ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-fg' : 'border-line text-muted hover:text-fg'}`}
          >
            {get(x.battingTeamId)?.shortName ?? x.battingTeamId} · {total(x)} <span className="font-normal text-faint">({x.overs} ov)</span>
          </button>
        ))}
      </div>

      {inn && <InningsCard inn={inn} index={tab} name={name} />}
    </div>
  )
}

function InningsCard({ inn, index, name }: { inn: Innings; index: number; name: (id: string) => string }) {
  const rr = runRate(inn.runs, inn.overs)
  const reqRate = inn.target && inn.maxOvers ? (inn.target * 6) / (inn.maxOvers * 6) : undefined
  const topRuns = Math.max(0, ...(inn.batting?.map((b) => b.runs) ?? []))
  const bestBowl = [...(inn.bowling ?? [])].sort((a, b) => b.wickets - a.wickets || a.runs - b.runs)[0]

  return (
    <div role="tabpanel" className="space-y-1">
      <InfoGrid
        items={[
          { label: `${ordinal(index + 1)} innings`, value: `${name(inn.battingTeamId)} ${total(inn)}` },
          { label: 'Overs', value: inn.maxOvers ? `${inn.overs} / ${inn.maxOvers}` : inn.overs },
          { label: 'Run rate', value: fixed(rr) },
          ...(inn.target
            ? [
                { label: 'Target', value: String(inn.target) },
                { label: 'Required rate (at start)', value: reqRate ? fixed(reqRate) : undefined },
              ]
            : []),
          { label: 'Extras', value: inn.extras && `${extrasSum(inn)} (b ${inn.extras.byes}, lb ${inn.extras.legByes}, w ${inn.extras.wides}, nb ${inn.extras.noBalls})` },
          { label: 'Powerplay', value: inn.powerplay && `${inn.powerplay.runs}/${inn.powerplay.wickets} (${inn.powerplay.label})` },
        ]}
      />

      <SubHeading>Batting</SubHeading>
      {inn.batting ? (
        <Table head={['Batter', '', 'R', 'B', '4s', '6s', 'SR']} align={['l', 'l', 'r', 'r', 'r', 'r', 'r']}>
          {inn.batting.map((b) => (
            <tr key={b.name} className="border-b border-line/60">
              <td className="py-2 font-medium">
                {cleanName(b.name)}
                {b.name.includes('†') && <span className="ml-1 text-faint" title="Wicket-keeper">†</span>}
                {b.runs === topRuns && <span className="ml-2 rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent)]">TOP</span>}
              </td>
              <td className="py-2 pl-3 text-xs text-muted">{b.dismissal}</td>
              <td className="py-2 pl-3 text-right font-bold">{b.runs}{b.dismissal === 'not out' ? '*' : ''}</td>
              <td className="py-2 pl-3 text-right text-muted">{b.balls}</td>
              <td className="py-2 pl-3 text-right text-muted">{b.fours}</td>
              <td className="py-2 pl-3 text-right text-muted">{b.sixes}</td>
              <td className="py-2 pl-3 text-right text-muted">{fixed(strikeRate(b.runs, b.balls), 1)}</td>
            </tr>
          ))}
          <tr className="text-muted">
            <td className="py-2" colSpan={2}>Extras</td>
            <td className="py-2 pl-3 text-right">{extrasSum(inn) ?? '—'}</td>
            <td colSpan={4} />
          </tr>
          <tr className="font-bold">
            <td className="py-2" colSpan={2}>Total</td>
            <td className="py-2 pl-3 text-right">{total(inn)}</td>
            <td className="py-2 pl-3 text-right text-xs font-normal text-muted" colSpan={4}>
              {inn.overs} overs · RR {fixed(rr)}
            </td>
          </tr>
        </Table>
      ) : (
        <NotAvailable what="Batting scorecard" />
      )}
      {inn.didNotBat && inn.didNotBat.length > 0 && <p className="pt-2 text-xs text-muted">Did not bat: {inn.didNotBat.join(', ')}</p>}

      <SubHeading>Bowling</SubHeading>
      {inn.bowling ? (
        <Table head={['Bowler', 'O', 'M', 'R', 'W', 'Econ']}>
          {inn.bowling.map((b) => (
            <tr key={b.name} className="border-b border-line/60">
              <td className="py-2 font-medium">
                {b.name}
                {b === bestBowl && b.wickets > 0 && <span className="ml-2 rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent)]">BEST</span>}
              </td>
              <td className="py-2 pl-3 text-right text-muted">{b.overs}</td>
              <td className="py-2 pl-3 text-right text-muted">{b.maidens}</td>
              <td className="py-2 pl-3 text-right text-muted">{b.runs}</td>
              <td className="py-2 pl-3 text-right font-bold">{b.wickets}</td>
              <td className="py-2 pl-3 text-right text-muted">{fixed(runRate(b.runs, b.overs))}</td>
            </tr>
          ))}
        </Table>
      ) : (
        <NotAvailable what="Bowling figures" />
      )}

      <SubHeading>Fall of wickets</SubHeading>
      {inn.fallOfWickets ? (
        <div className="flex flex-wrap gap-2">
          {inn.fallOfWickets.map((f) => (
            <span key={f.wicket} className="rounded-lg border border-line bg-surface-2/60 px-2.5 py-1.5 text-xs tabular">
              <b>{f.score}-{f.wicket}</b> <span className="text-muted">{f.batter}, {f.over} ov</span>
            </span>
          ))}
        </div>
      ) : (
        <NotAvailable what="Fall of wickets" />
      )}

      <SubHeading>Partnerships</SubHeading>
      {inn.partnerships ? (
        <div className="space-y-2">
          {inn.partnerships.map((p) => {
            const max = Math.max(...inn.partnerships!.map((x) => x.runs))
            return (
              <div key={p.wicket} className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 text-xs">
                <span className="text-faint">{ordinal(p.wicket)}</span>
                <div>
                  <div className="mb-1 truncate text-muted">{p.batters.join(' & ')}</div>
                  <div className="h-1.5 rounded-full bg-surface-3">
                    <div className="h-full rounded-full" style={{ width: `${(p.runs / max) * 100}%`, background: 'var(--accent)' }} />
                  </div>
                </div>
                <span className="w-24 text-right tabular">
                  <b>{p.runs}</b> <span className="text-faint">({p.balls}b)</span>
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <NotAvailable what="Partnerships" />
      )}

      {inn.target && inn.maxOvers && (
        <p className="pt-4 text-xs text-faint">
          Required rate shown is the rate needed at the start of the chase ({inn.target} from {inn.maxOvers * 6} balls). The chase used {oversToBalls(inn.overs)} balls.
        </p>
      )}
    </div>
  )
}
