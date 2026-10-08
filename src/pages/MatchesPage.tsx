import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { MatchCard } from '@/components/match/MatchCard'
import { SportIcon } from '@/components/ui/SportIcon'
import { MatchCardSkeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { SPORTS, SPORT_LIST, isSportId } from '@/config/sports'
import { useCompetitors } from '@/hooks/useCompetitors'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { sportsService } from '@/services/sportsService'
import type { MatchSummary, SportId } from '@/types'

const PAGE_SIZE = 24

export default function MatchesPage() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('sport') ?? undefined
  const sport: SportId = isSportId(raw) ? raw : 'cricket'
  const cfg = SPORTS[sport]
  useDocumentTitle(`${cfg.label} matches`)
  const { get } = useCompetitors(sport)

  const [items, setItems] = useState<MatchSummary[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)

  // Reset when the sport changes.
  useEffect(() => {
    setItems([])
    setPage(1)
  }, [sport])

  useEffect(() => {
    let live = true
    setLoading(true)
    setError(null)
    sportsService
      .listMatches(sport, page, PAGE_SIZE)
      .then((res) => {
        if (!live) return
        setItems((prev) => (page === 1 ? res.items : [...prev, ...res.items.filter((m) => !prev.some((p) => p.id === m.id))]))
        setHasMore(res.hasMore)
        setTotal(res.total)
      })
      .catch((e) => live && setError(e))
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [sport, page, attempt])

  return (
    <div className="mx-auto max-w-6xl px-4 py-10" style={{ ['--accent' as string]: cfg.accent, ['--accent-soft' as string]: cfg.accentSoft }}>
      <h1 className="text-3xl font-black tracking-tight">Matches</h1>
      <p className="mt-1 text-muted">Browse every match available in the current data source, newest first.</p>

      <div role="tablist" aria-label="Sport" className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {SPORT_LIST.map((s) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={s.id === sport}
            onClick={() => setParams({ sport: s.id })}
            className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${s.id === sport ? 'border-transparent' : 'border-line text-muted hover:text-fg'}`}
            style={s.id === sport ? { color: s.accent, background: s.accentSoft } : undefined}
          >
            <SportIcon sport={s.id} />
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {error ? (
          <ErrorState error={error} onRetry={() => setAttempt((n) => n + 1)} />
        ) : !loading && items.length === 0 ? (
          <EmptyState title={`No ${cfg.label.toLowerCase()} matches available`}>The current data source has no matches for this sport.</EmptyState>
        ) : (
          <>
            <p className="mb-3 text-xs text-faint">{total ? `Showing ${items.length} of ${total}` : ''}</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((m) => <MatchCard key={m.id} match={m} get={get} />)}
              {loading && Array.from({ length: page === 1 ? 6 : 3 }, (_, i) => <MatchCardSkeleton key={`s${i}`} />)}
            </div>
            {hasMore && !loading && (
              <div className="mt-8 flex justify-center">
                <button onClick={() => setPage((p) => p + 1)} className="rounded-xl border border-line-strong px-5 py-2.5 text-sm font-semibold transition hover:bg-surface-3">
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
