import { Link } from 'react-router'
import { SPORTS } from '@/config/sports'
import type { Competitor, HeadToHead, MatchSummary } from '@/types'
import { formatDate } from '@/utils/format'
import { SportBadge } from '../ui/Badges'
import { CompetitorAvatar } from '../ui/CompetitorAvatar'
import { matchPath } from './MatchCard'

interface Props {
  h2h: HeadToHead
  a: Competitor
  b: Competitor
}

function MeetingLink({ label, m }: { label: string; m?: MatchSummary }) {
  if (!m) return null
  const inner = (
    <>
      <p className="text-[11px] font-semibold tracking-wider text-faint uppercase">{label}</p>
      <p className="mt-1 text-sm font-semibold">{formatDate(m.date)}</p>
      <p className="mt-0.5 truncate text-xs text-muted">{m.result.text}</p>
    </>
  )
  return m.hasDetail ? (
    <Link to={matchPath(m)} className="block rounded-xl border border-line bg-surface-2/60 p-3 transition hover:border-line-strong">
      {inner}
    </Link>
  ) : (
    <div className="rounded-xl border border-line bg-surface-2/60 p-3">{inner}</div>
  )
}

export function HeadToHeadSummary({ h2h, a, b }: Props) {
  const cfg = SPORTS[h2h.sport]
  const aw = h2h.wins[a.id] ?? 0
  const bw = h2h.wins[b.id] ?? 0
  const other = h2h.draws + h2h.noResults
  const total = Math.max(1, h2h.total)
  const drawLabel = h2h.sport === 'cricket' ? 'Tied / NR' : 'Draws'

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-line-strong bg-surface p-5 sm:p-8"
      style={{ backgroundImage: `radial-gradient(600px 200px at 50% -40%, ${cfg.accentSoft}, transparent)` }}
      aria-label="Head-to-head summary"
    >
      <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
        <SportBadge sport={h2h.sport} />
        <span className="text-xs text-muted">{h2h.total} meeting{h2h.total === 1 ? '' : 's'} in the current data source</span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <CompetitorAvatar competitor={a} size="xl" />
          <h1 className="text-lg font-bold tracking-tight sm:text-2xl">{a.name}</h1>
        </div>
        <div className="text-center">
          <div className="flex items-baseline gap-2 tabular sm:gap-4">
            <span className="text-4xl font-black sm:text-6xl">{aw}</span>
            <span className="text-lg font-bold text-faint sm:text-2xl">–</span>
            <span className="text-4xl font-black sm:text-6xl">{bw}</span>
          </div>
          <p className="mt-1 text-xs tracking-wider text-muted uppercase">Wins</p>
          {other > 0 && (
            <p className="mt-1 text-xs text-draw">
              {h2h.draws > 0 && `${h2h.draws} ${h2h.sport === 'cricket' ? 'tied' : 'drawn'}`}
              {h2h.draws > 0 && h2h.noResults > 0 && ' · '}
              {h2h.noResults > 0 && `${h2h.noResults} no result`}
            </p>
          )}
        </div>
        <div className="flex flex-col items-center gap-3 text-center">
          <CompetitorAvatar competitor={b} size="xl" />
          <h1 className="text-lg font-bold tracking-tight sm:text-2xl">{b.name}</h1>
        </div>
      </div>

      {h2h.total > 0 && (
        <div className="mx-auto mt-6 max-w-xl">
          <div className="flex h-2 overflow-hidden rounded-full bg-surface-3" role="img" aria-label={`${a.name} ${aw} wins, ${b.name} ${bw} wins, ${other} ${drawLabel.toLowerCase()}`}>
            <div style={{ width: `${(aw / total) * 100}%`, background: a.colors.primary }} />
            <div style={{ width: `${(other / total) * 100}%` }} className="bg-draw/60" />
            <div style={{ width: `${(bw / total) * 100}%`, background: b.colors.primary }} />
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs">
            <div><p className="text-base font-bold tabular">{h2h.total}</p><p className="text-faint">Total</p></div>
            <div><p className="text-base font-bold tabular">{aw}</p><p className="truncate text-faint">{a.shortName} wins</p></div>
            <div><p className="text-base font-bold tabular">{other}</p><p className="text-faint">{drawLabel}</p></div>
            <div><p className="text-base font-bold tabular">{bw}</p><p className="truncate text-faint">{b.shortName} wins</p></div>
          </div>
        </div>
      )}

      {h2h.total > 0 && (
        <div className="mx-auto mt-6 grid max-w-xl grid-cols-2 gap-3">
          <MeetingLink label="Latest meeting" m={h2h.latest} />
          <MeetingLink label="First meeting" m={h2h.first} />
        </div>
      )}
    </section>
  )
}
