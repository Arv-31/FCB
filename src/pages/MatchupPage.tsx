import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { HeadToHeadSummary } from '@/components/match/HeadToHeadSummary'
import { MatchCard } from '@/components/match/MatchCard'
import { matchupPath } from '@/components/search/SearchForm'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { SectionHeading } from '@/components/ui/Card'
import { MatchCardSkeleton, Skeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { SPORTS, isSportId } from '@/config/sports'
import { useAsync } from '@/hooks/useAsync'
import { useCompetitors } from '@/hooks/useCompetitors'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { sportsService } from '@/services/sportsService'
import type { Competitor, SportId } from '@/types'
import { DataError } from '@/types'
import { formatDate } from '@/utils/format'

const STEP = 6

/** Accepts competitor ids or free text in the URL (/matchup/cricket/IND/AUS also works). */
async function resolveParam(sport: SportId, value: string): Promise<Competitor> {
  const all = await sportsService.listCompetitors(sport)
  const byId = all.find((c) => c.id === value)
  if (byId) return byId
  const r = await sportsService.resolve(sport, decodeURIComponent(value))
  if (r.status === 'resolved') return r.competitor
  throw new DataError('unknown-competitor', `We couldn’t find “${decodeURIComponent(value)}” in ${SPORTS[sport].label}.`)
}

export default function MatchupPage() {
  const { sport: rawSport = '', a = '', b = '' } = useParams()
  const [params] = useSearchParams()
  const date = params.get('date') ?? ''
  const navigate = useNavigate()
  const [visible, setVisible] = useState(STEP)

  const sport: SportId | null = isSportId(rawSport) ? rawSport : null
  const { get } = useCompetitors(sport ?? 'cricket')

  const state = useAsync(async () => {
    if (!sport) throw new DataError('invalid-request', `“${rawSport}” isn’t a supported sport yet.`)
    const [ca, cb] = await Promise.all([resolveParam(sport, a), resolveParam(sport, b)])
    const h2h = await sportsService.getHeadToHead(sport, ca.id, cb.id)
    return { ca, cb, h2h }
  }, [sport, a, b])

  const data = state.data
  useDocumentTitle(data ? `${data.ca.name} vs ${data.cb.name}` : 'Head-to-head')

  const cfg = SPORTS[sport ?? 'cricket']
  const style = { ['--accent' as string]: cfg.accent, ['--accent-soft' as string]: cfg.accentSoft }

  if (state.status === 'loading') {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10" aria-busy="true">
        <Skeleton className="mb-5 h-4 w-48" />
        <Skeleton className="mb-8 h-72 w-full rounded-3xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => <MatchCardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <ErrorState error={state.error} onRetry={state.retry} />
        <p className="mt-6 text-center text-sm">
          <Link to="/" className="text-muted underline underline-offset-2 hover:text-fg">← Back to search</Link>
        </p>
      </div>
    )
  }

  const { ca, cb, h2h } = state.data
  const onDate = date ? h2h.matches.filter((m) => m.date === date) : []
  const list = h2h.matches.slice(0, visible)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8" style={style}>
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: cfg.label, to: `/matches?sport=${h2h.sport}` }, { label: `${ca.name} vs ${cb.name}` }]} />

      <HeadToHeadSummary h2h={h2h} a={ca} b={cb} />

      <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
        <button
          onClick={() => navigate(matchupPath(h2h.sport, cb.id, ca.id, date || undefined))}
          className="rounded-lg border border-line px-3 py-1.5 text-muted transition hover:text-fg"
        >
          ⇄ Swap sides
        </button>
        <Link to="/" className="rounded-lg border border-line px-3 py-1.5 text-muted transition hover:text-fg">
          New search
        </Link>
      </div>

      <section className="mt-10" aria-labelledby="h2h-matches">
        <SectionHeading title="Head-to-head matches" eyebrow="Newest first" />

        {date && (
          <div className="mb-4 rounded-xl border border-line bg-surface-2/50 px-4 py-3 text-sm">
            {onDate.length ? (
              <span>Highlighted: the meeting on <b>{formatDate(date)}</b>.</span>
            ) : (
              <span className="text-muted">No meeting found on {formatDate(date)} — showing all meetings instead.</span>
            )}{' '}
            <Link to={matchupPath(h2h.sport, ca.id, cb.id)} className="text-faint underline underline-offset-2 hover:text-fg">Clear date</Link>
          </div>
        )}

        {h2h.total === 0 ? (
          <EmptyState title={`No meetings found between ${ca.name} and ${cb.name}`}>
            The current data source has no record of these two {cfg.competitorNoun.toLowerCase()}s meeting.{' '}
            <Link to="/matches" className="underline underline-offset-2">Browse available matches</Link>.
          </EmptyState>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((m) => <MatchCard key={m.id} match={m} get={get} highlight={m.date === date} />)}
            </div>
            {visible < h2h.matches.length && (
              <div className="mt-8 flex justify-center">
                <button onClick={() => setVisible((v) => v + STEP)} className="rounded-xl border border-line-strong px-5 py-2.5 text-sm font-semibold hover:bg-surface-3">
                  Show more ({h2h.matches.length - visible} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
