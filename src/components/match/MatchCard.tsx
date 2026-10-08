import { Link } from 'react-router'
import { SPORTS } from '@/config/sports'
import type { Competitor, MatchSummary } from '@/types'
import { formatDate, venueText } from '@/utils/format'
import { DemoBadge } from '../ui/Badges'
import { CompetitorAvatar } from '../ui/CompetitorAvatar'
import { SportIcon } from '../ui/SportIcon'

export const matchPath = (m: Pick<MatchSummary, 'sport' | 'id'>) => `/match/${m.sport}/${m.id}`

interface Props {
  match: MatchSummary
  get: (id: string) => Competitor | undefined
  highlight?: boolean
}

export function MatchCard({ match, get, highlight }: Props) {
  const cfg = SPORTS[match.sport]
  const { winnerId, outcome } = match.result
  const rows = match.competitorIds.map((id, i) => ({ id, c: get(id), score: match.score?.[i] }))

  const body = (
    <>
      <div className="mb-4 flex items-center justify-between gap-2 text-xs text-muted">
        <span className="flex min-w-0 items-center gap-1.5">
          <span style={{ color: cfg.accent }}>
            <SportIcon sport={match.sport} className="h-3.5 w-3.5" />
          </span>
          <time dateTime={match.date} className="font-medium text-fg/90">{formatDate(match.date)}</time>
        </span>
        <DemoBadge source={match.source} />
      </div>

      <div className="space-y-2.5">
        {rows.map(({ id, c, score }) => {
          const won = winnerId === id
          const lost = outcome === 'win' && !won
          return (
            <div key={id} className="flex items-center gap-3">
              <CompetitorAvatar competitor={c} size="sm" />
              <span className={`min-w-0 flex-1 truncate font-semibold ${lost ? 'text-muted' : ''}`}>{c?.name ?? id}</span>
              {score !== undefined && <span className={`tabular text-sm font-bold ${lost ? 'text-muted' : ''}`}>{score}</span>}
              {won && <span className="text-[10px] font-bold tracking-wider text-win uppercase">Won</span>}
            </div>
          )
        })}
      </div>

      <p className={`mt-4 text-sm font-medium ${outcome === 'win' ? 'text-fg' : outcome === 'draw' ? 'text-draw' : 'text-muted'}`}>{match.result.text}</p>

      <div className="mt-3 border-t border-line pt-3 text-xs text-muted">
        <p className="truncate">
          {match.competition}
          {match.stage ? ` · ${match.stage}` : ''}
        </p>
        <p className="mt-0.5 truncate text-faint">
          {venueText(match.venue) || 'Venue not available from source'}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        {match.hasDetail ? (
          <span className="font-semibold transition-colors group-hover:text-fg" style={{ color: cfg.accent }}>
            Full match summary →
          </span>
        ) : (
          <span className="text-faint">Result only — no detailed record</span>
        )}
      </div>
    </>
  )

  const base = `group block rounded-2xl border bg-surface/80 p-5 transition duration-200 animate-fade-up ${highlight ? 'border-[var(--accent)]' : 'border-line'}`

  return match.hasDetail ? (
    <Link
      to={matchPath(match)}
      className={`${base} hover:-translate-y-0.5 hover:border-line-strong hover:bg-surface-2 hover:shadow-xl hover:shadow-black/30`}
      aria-label={`${rows.map((r) => r.c?.name).join(' vs ')}, ${formatDate(match.date)} — ${match.result.text}`}
    >
      {body}
    </Link>
  ) : (
    <div className={`${base} opacity-80`}>{body}</div>
  )
}
