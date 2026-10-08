import type { Competitor, FootballMatchDetail } from '@/types'
import { minuteLabel } from '@/utils/format'
import { InfoGrid, SubHeading } from '../../ui/InfoGrid'
import { StatBar } from '../../ui/StatBar'
import { NotAvailable } from '../../ui/States'

interface Props {
  detail: FootballMatchDetail
  get: (id: string) => Competitor | undefined
}

export function FootballStats({ detail, get }: Props) {
  const s = detail.stats
  const [home, away] = detail.competitorIds
  const H = get(home)
  const A = get(away)
  const ts = s.teamStats
  const colors: [string, string] = [H?.colors.primary ?? '#888', A?.colors.primary ?? '#888']
  const count = (team: string, pred: (card: string) => boolean) => s.cards?.filter((c) => c.teamId === team && pred(c.card)).length ?? 0
  const cardsKnown = s.cards !== undefined

  return (
    <div>
      <InfoGrid
        items={[
          { label: 'Final score', value: `${s.fullTime[0]} – ${s.fullTime[1]}${s.extraTime ? ' (a.e.t.)' : ''}` },
          { label: 'Half-time', value: s.halfTime && `${s.halfTime[0]} – ${s.halfTime[1]}` },
          ...(s.penaltyShootout ? [{ label: 'Penalty shoot-out', value: `${s.penaltyShootout[0]} – ${s.penaltyShootout[1]}` }] : []),
          { label: 'Player of the match', value: s.playerOfTheMatch?.name },
          { label: 'Referee', value: s.referee },
          { label: 'Attendance', value: s.attendance?.toLocaleString('en-GB') },
          ...(s.managers ? [{ label: 'Managers', value: s.managers.some(Boolean) ? `${s.managers[0] ?? '—'} / ${s.managers[1] ?? '—'}` : undefined }] : []),
        ]}
      />

      <SubHeading>Goals</SubHeading>
      {s.goals.length === 0 ? (
        <p className="text-sm text-muted">No goals were scored.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {[home, away].map((team) => (
            <div key={team}>
              <p className="mb-2 text-xs font-semibold text-muted">{get(team)?.name}</p>
              <ul className="space-y-1.5">
                {s.goals.filter((g) => g.teamId === team).map((g, i) => (
                  <li key={i} className="flex items-baseline gap-3 rounded-lg border border-line bg-surface-2/50 px-3 py-2 text-sm">
                    <span className="w-12 shrink-0 font-bold tabular" style={{ color: 'var(--accent)' }}>{minuteLabel(g.minute, g.addedTime)}</span>
                    <span>
                      <b>{g.scorer}</b>
                      {g.kind !== 'open-play' && <span className="text-faint"> ({g.kind.replace('-', ' ')})</span>}
                      {g.assist ? <span className="block text-xs text-muted">Assist: {g.assist}</span> : <span className="block text-xs text-faint">No assist recorded</span>}
                    </span>
                  </li>
                ))}
                {s.goals.every((g) => g.teamId !== team) && <li className="text-sm text-faint">—</li>}
              </ul>
            </div>
          ))}
        </div>
      )}

      <SubHeading>Team statistics</SubHeading>
      <div className="flex justify-between text-xs font-semibold text-muted">
        <span>{H?.name}</span>
        <span>{A?.name}</span>
      </div>
      {!ts && <div className="my-3"><NotAvailable what="Team statistics" /></div>}
      <div className="divide-y divide-line/50">
        <StatBar label={ts?.possessionEstimated ? 'Possession (estimated from event timings)' : 'Possession'} values={ts?.possession} format={(v) => `${v}%`} colors={colors} />
        <StatBar label="Expected goals (xG)" values={ts?.xg} format={(v) => v.toFixed(2)} colors={colors} />
        <StatBar label="Shots" values={ts?.shots} colors={colors} />
        <StatBar label="Shots on target" values={ts?.shotsOnTarget} colors={colors} />
        <StatBar label="Corners" values={ts?.corners} colors={colors} />
        <StatBar label="Fouls" values={ts?.fouls} colors={colors} lowerIsBetter />
        <StatBar label="Offsides" values={ts?.offsides} colors={colors} lowerIsBetter />
        <StatBar label="Yellow cards" values={cardsKnown ? [count(home, (c) => c === 'yellow' || c === 'second-yellow'), count(away, (c) => c === 'yellow' || c === 'second-yellow')] : undefined} colors={colors} lowerIsBetter />
        <StatBar label="Red cards" values={cardsKnown ? [count(home, (c) => c !== 'yellow'), count(away, (c) => c !== 'yellow')] : undefined} colors={colors} lowerIsBetter />
        <StatBar label="Passes" values={ts?.passes} colors={colors} />
        <StatBar label="Pass accuracy" values={ts?.passAccuracy} format={(v) => `${v}%`} colors={colors} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <SubHeading>Cards</SubHeading>
          {s.cards ? (
            s.cards.length ? (
              <ul className="space-y-1.5 text-sm">
                {s.cards.map((c, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className={`h-4 w-3 rounded-sm ${c.card === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'}`} aria-label={c.card} />
                    <span className="w-12 text-muted tabular">{minuteLabel(c.minute, c.addedTime)}</span>
                    <span>{c.player} <span className="text-faint">({get(c.teamId)?.shortName}{c.card === 'second-yellow' ? ', 2nd yellow' : ''})</span></span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">No cards shown.</p>
          ) : <NotAvailable what="Cards" />}
        </div>
        <div>
          <SubHeading>Substitutions</SubHeading>
          {s.substitutions ? (
            <ul className="space-y-1.5 text-sm">
              {s.substitutions.map((sub, i) => (
                <li key={i} className="flex items-baseline gap-3">
                  <span className="w-12 text-muted tabular">{minuteLabel(sub.minute)}</span>
                  <span>
                    <span className="text-win">▲ {sub.playerOn}</span> <span className="text-loss/80">▼ {sub.playerOff}</span>{' '}
                    <span className="text-faint">({get(sub.teamId)?.shortName})</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : <NotAvailable what="Substitutions" />}
        </div>
      </div>

      {s.lineups && (s.lineups.home.length > 0 || s.lineups.away.length > 0) && (
        <>
          <SubHeading>Starting line-ups</SubHeading>
          <div className="grid gap-4 sm:grid-cols-2">
            {([['home', H], ['away', A]] as const).map(([k, team]) => (
              <div key={k}>
                <p className="mb-2 text-xs font-semibold text-muted">{team?.name}</p>
                <ol className="space-y-1 text-sm">
                  {s.lineups![k].map((p) => (
                    <li key={p} className="truncate rounded-md bg-surface-2/50 px-2.5 py-1">{p}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </>
      )}

      <SubHeading>Player ratings</SubHeading>
      {s.playerRatings?.length ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {s.playerRatings.map((r) => (
            <li key={r.player} className="flex justify-between rounded-lg border border-line px-3 py-2 text-sm">
              <span>{r.player}</span>
              <b className="tabular">{r.rating.toFixed(1)}</b>
            </li>
          ))}
        </ul>
      ) : (
        <NotAvailable what="Player ratings (no reliable ratings source is connected)" />
      )}
    </div>
  )
}
