import { SPORTS } from '@/config/sports'
import type { Competitor, MatchDetail } from '@/types'
import { formatDate } from '@/utils/format'
import { DemoBadge, SportBadge } from '../ui/Badges'
import { CompetitorAvatar } from '../ui/CompetitorAvatar'

export function MatchHeader({ detail, get }: { detail: MatchDetail; get: (id: string) => Competitor | undefined }) {
  const cfg = SPORTS[detail.sport]
  const [aId, bId] = detail.competitorIds
  const a = get(aId)
  const b = get(bId)
  const winner = detail.result.winnerId

  const side = (id: string, c: Competitor | undefined, score: string | undefined, align: 'left' | 'right') => {
    const lost = detail.result.outcome === 'win' && winner !== id
    return (
      <div className={`flex min-w-0 flex-col items-center gap-3 text-center sm:flex-row ${align === 'right' ? 'sm:flex-row-reverse sm:text-right' : 'sm:text-left'}`}>
        <CompetitorAvatar competitor={c} size="lg" />
        <div className="min-w-0">
          <p className={`text-base font-bold tracking-tight sm:text-2xl ${lost ? 'text-muted' : ''}`}>{c?.name ?? id}</p>
          {score && <p className={`mt-1 text-2xl font-black tabular sm:text-4xl ${lost ? 'text-muted' : ''}`}>{score}</p>}
          {winner === id && <p className="mt-1 text-[11px] font-bold tracking-widest text-win uppercase">Winner</p>}
        </div>
      </div>
    )
  }

  const ufc = detail.sport === 'ufc' ? detail.stats : null

  return (
    <header
      className="relative overflow-hidden rounded-3xl border border-line-strong bg-surface p-5 sm:p-8"
      style={{ backgroundImage: `radial-gradient(700px 240px at 50% -30%, ${cfg.accentSoft}, transparent)` }}
    >
      <div className="mb-6 flex flex-wrap items-center justify-center gap-2 text-xs text-muted">
        <SportBadge sport={detail.sport} />
        <span className="rounded-full border border-line px-2.5 py-1">{detail.competition}</span>
        {detail.stage && <span className="rounded-full border border-line px-2.5 py-1">{detail.stage}</span>}
        <DemoBadge source={detail.source} />
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
        {side(aId, a, detail.score?.[0], 'left')}
        <div className="text-center text-sm font-black tracking-widest text-faint">
          {detail.sport === 'football' && detail.stats.halfTime ? (
            <span className="block text-[11px] font-medium tracking-normal">HT {detail.stats.halfTime[0]}–{detail.stats.halfTime[1]}</span>
          ) : null}
          VS
        </div>
        {side(bId, b, detail.score?.[1], 'right')}
      </div>

      <p className="mx-auto mt-6 max-w-2xl text-center text-lg font-semibold sm:text-xl" style={{ color: cfg.accent }}>
        {detail.result.text}
      </p>
      {ufc && (
        <p className="mt-1 text-center text-sm text-muted">
          {ufc.method}
          {ufc.methodDetail ? ` (${ufc.methodDetail})` : ''} · Round {ufc.endRound}, {ufc.endTime} · {ufc.weightClass}
        </p>
      )}

      <dl className="mx-auto mt-6 grid max-w-3xl grid-cols-2 gap-3 text-center text-xs sm:grid-cols-4">
        {[
          ['Date', formatDate(detail.date)],
          ['Venue', detail.venue.name ?? ''],
          ['Location', [detail.venue.city, detail.venue.country].filter(Boolean).join(', ')],
          ['Competition', detail.competition],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-line bg-surface-2/50 px-3 py-2">
            <dt className="text-faint">{k}</dt>
            <dd className="mt-0.5 truncate font-medium text-fg" title={v}>{v || <span className="font-normal text-faint italic">Not available</span>}</dd>
          </div>
        ))}
      </dl>
    </header>
  )
}
