import type { Attempted, Competitor, UFCMatchDetail } from '@/types'
import { clockToSeconds, pct, secondsToClock } from '@/utils/format'
import { InfoGrid, SubHeading, Table } from '../../ui/InfoGrid'
import { StatBar } from '../../ui/StatBar'
import { NotAvailable } from '../../ui/States'

interface Props {
  detail: UFCMatchDetail
  get: (id: string) => Competitor | undefined
}

const la = (x?: Attempted) => (x ? `${x.landed}/${x.attempted}` : '—')
const both = <T,>(a: T | undefined, b: T | undefined, f: (v: T) => number): [number, number] | undefined =>
  a !== undefined && b !== undefined ? [f(a), f(b)] : undefined

export function UFCStats({ detail, get }: Props) {
  const s = detail.stats
  const [aId, bId] = detail.competitorIds
  const A = get(aId)
  const B = get(bId)
  const [ta, tb] = s.totals
  const colors: [string, string] = [A?.colors.primary ?? '#888', B?.colors.primary ?? '#888']

  return (
    <div>
      <InfoGrid
        items={[
          { label: 'Event', value: s.event },
          { label: 'Weight class', value: s.weightClass },
          { label: 'Bout', value: `${s.scheduledRounds ? `${s.scheduledRounds} rounds` : 'Format not stated'}${s.titleFight ? ' · Title fight' : ''}` },
          { label: 'Method', value: `${s.method}${s.methodDetail ? ` — ${s.methodDetail}` : ''}` },
          { label: 'Round', value: String(s.endRound) },
          { label: 'Time', value: s.endTime },
          { label: 'Referee', value: s.referee },
          { label: 'Bonuses', value: s.bonuses?.join(', ') },
        ]}
      />

      <SubHeading>Fight totals</SubHeading>
      <div className="flex justify-between text-xs font-semibold text-muted">
        <span>{A?.name}</span>
        <span>{B?.name}</span>
      </div>
      <div className="divide-y divide-line/50">
        <StatBar label="Significant strikes landed" values={both(ta.sigStrikes, tb.sigStrikes, (x) => x.landed)} colors={colors} />
        <StatBar label="Significant strike accuracy" values={both(ta.sigStrikes, tb.sigStrikes, (x) => pct(x.landed, x.attempted))} format={(v) => `${v}%`} colors={colors} />
        <StatBar label="Total strikes landed" values={both(ta.totalStrikes, tb.totalStrikes, (x) => x.landed)} colors={colors} />
        <StatBar label="Takedowns landed" values={both(ta.takedowns, tb.takedowns, (x) => x.landed)} colors={colors} />
        <StatBar label="Submission attempts" values={both(ta.submissionAttempts, tb.submissionAttempts, (x) => x)} colors={colors} />
        <StatBar label="Knockdowns" values={both(ta.knockdowns, tb.knockdowns, (x) => x)} colors={colors} />
        <StatBar label="Control time" values={both(ta.controlTime, tb.controlTime, clockToSeconds)} format={secondsToClock} colors={colors} />
        {(ta.reversals !== undefined || tb.reversals !== undefined) && <StatBar label="Reversals" values={both(ta.reversals, tb.reversals, (x) => x)} colors={colors} />}
      </div>

      {(ta.head || tb.head) && (
        <div className="mt-4 grid gap-x-8 md:grid-cols-2">
          <div>
            <p className="mt-3 text-xs font-semibold text-muted">Significant strikes by target</p>
            <StatBar label="Head" values={both(ta.head, tb.head, (x) => x.landed)} colors={colors} />
            <StatBar label="Body" values={both(ta.body, tb.body, (x) => x.landed)} colors={colors} />
            <StatBar label="Leg" values={both(ta.leg, tb.leg, (x) => x.landed)} colors={colors} />
          </div>
          <div>
            <p className="mt-3 text-xs font-semibold text-muted">Significant strikes by position</p>
            <StatBar label="Distance" values={both(ta.distance, tb.distance, (x) => x.landed)} colors={colors} />
            <StatBar label="Clinch" values={both(ta.clinch, tb.clinch, (x) => x.landed)} colors={colors} />
            <StatBar label="Ground" values={both(ta.ground, tb.ground, (x) => x.landed)} colors={colors} />
          </div>
        </div>
      )}
      <p className="mt-2 text-xs text-faint">
        Strikes shown as landed; full landed/attempted: {A?.shortName} sig. {la(ta.sigStrikes)}, total {la(ta.totalStrikes)}, TD {la(ta.takedowns)} · {B?.shortName} sig. {la(tb.sigStrikes)}, total {la(tb.totalStrikes)}, TD {la(tb.takedowns)}.
      </p>

      <SubHeading>Round by round</SubHeading>
      {s.rounds?.length ? (
        <Table head={['Round', 'Fighter', 'Sig. str.', 'TD', 'Sub. att.', 'KD', 'Ctrl']} align={['l', 'l', 'r', 'r', 'r', 'r', 'r']}>
          {s.rounds.flatMap((r) =>
            r.fighters.map((f, i) => (
              <tr key={`${r.round}-${i}`} className={i === 1 ? 'border-b border-line' : ''}>
                <td className="py-1.5 font-semibold">{i === 0 ? `R${r.round}` : ''}</td>
                <td className="py-1.5 pl-3">
                  <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: colors[i] }} />
                  {(i === 0 ? A : B)?.shortName}
                </td>
                <td className="py-1.5 pl-3 text-right">{la(f.sigStrikes)}</td>
                <td className="py-1.5 pl-3 text-right">{la(f.takedowns)}</td>
                <td className="py-1.5 pl-3 text-right">{f.submissionAttempts ?? '—'}</td>
                <td className="py-1.5 pl-3 text-right">{f.knockdowns ?? '—'}</td>
                <td className="py-1.5 pl-3 text-right">{f.controlTime ?? '—'}</td>
              </tr>
            )),
          )}
        </Table>
      ) : (
        <NotAvailable what="Round-by-round statistics" />
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <SubHeading>Judges’ scorecards</SubHeading>
          {s.scorecards?.length ? (
            <ul className="space-y-2">
              {s.scorecards.map((c) => (
                <li key={c.judge} className="flex items-center justify-between rounded-lg border border-line bg-surface-2/50 px-3 py-2 text-sm">
                  <span className="text-muted">{c.judge}</span>
                  <span className="font-bold tabular">
                    {c.scores[0]} – {c.scores[1]}
                  </span>
                </li>
              ))}
              <li className="text-xs text-faint">Scores listed {A?.shortName} first.</li>
            </ul>
          ) : s.method.startsWith('Decision') ? (
            <NotAvailable what="Judges’ scorecards" />
          ) : (
            <p className="text-sm text-muted">The fight ended inside the distance, so no scorecards were needed.</p>
          )}
        </div>
        <div>
          <SubHeading>Career records</SubHeading>
          {s.records?.before || s.records?.after ? (
            <Table head={['Fighter', 'Before', 'After']} compact>
              {[A, B].map((f, i) => (
                <tr key={i} className="border-b border-line/60">
                  <td className="py-2 font-medium">{f?.name}</td>
                  <td className="py-2 pl-3 text-right tabular">{s.records?.before?.[i] ?? '—'}</td>
                  <td className="py-2 pl-3 text-right tabular">{s.records?.after?.[i] ?? '—'}</td>
                </tr>
              ))}
            </Table>
          ) : (
            <NotAvailable what="Career records before/after this fight" />
          )}
        </div>
      </div>
    </div>
  )
}
