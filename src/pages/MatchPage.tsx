import { useMemo } from 'react'
import { Link, useParams } from 'react-router'
import { AnalysisSection } from '@/components/match/AnalysisSection'
import { MatchHeader } from '@/components/match/MatchHeader'
import { Timeline } from '@/components/match/Timeline'
import { matchupPath } from '@/components/search/SearchForm'
import { SportStats } from '@/components/sports/SportStats'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Card, SectionHeading } from '@/components/ui/Card'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState, NotAvailable } from '@/components/ui/States'
import { SPORTS, isSportId } from '@/config/sports'
import { useAsync } from '@/hooks/useAsync'
import { useCompetitors } from '@/hooks/useCompetitors'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { analysisEngine } from '@/services/analysis'
import { buildNarrative } from '@/services/narrative'
import { sportsService } from '@/services/sportsService'
import { buildTimeline } from '@/services/timeline/buildTimeline'
import { DataError } from '@/types'
import { formatDate } from '@/utils/format'

const SECTIONS = [
  ['summary', 'Summary'],
  ['stats', 'Statistics'],
  ['timeline', 'Timeline'],
  ['analysis', 'AI Analysis'],
] as const

function MatchSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8" aria-busy="true" aria-label="Loading match">
      <Skeleton className="mb-5 h-4 w-64" />
      <Skeleton className="mb-6 h-80 w-full rounded-3xl" />
      <Skeleton className="mb-3 h-6 w-48" />
      <Skeleton className="mb-2 h-4 w-full" />
      <Skeleton className="mb-2 h-4 w-11/12" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  )
}

export default function MatchPage() {
  const { sport: rawSport = '', id = '' } = useParams()
  const sport = isSportId(rawSport) ? rawSport : null
  const competitors = useCompetitors(sport ?? 'cricket')
  const { get, nameOf } = competitors

  // Detailed statistics are fetched only here, when a single match is opened.
  const detailState = useAsync(() => {
    if (!sport) return Promise.reject(new DataError('invalid-request', `“${rawSport}” isn’t a supported sport.`))
    return sportsService.getMatchDetail(sport, id)
  }, [sport, id])
  const detail = detailState.data

  const ready = detail && competitors.status === 'success'
  const timeline = useMemo(() => (ready ? buildTimeline(detail, nameOf) : []), [ready, detail, nameOf])
  const narrative = useMemo(() => (ready ? buildNarrative(detail, nameOf) : []), [ready, detail, nameOf])
  const analysis = useAsync(async () => (ready ? analysisEngine.analyze(detail, nameOf) : null), [ready, detail, nameOf])

  const title = detail ? `${nameOf(detail.competitorIds[0])} vs ${nameOf(detail.competitorIds[1])}, ${formatDate(detail.date, 'short')}` : 'Match'
  useDocumentTitle(title)

  if (detailState.status === 'loading' || (detail && competitors.status === 'loading')) return <MatchSkeleton />

  if (detailState.status === 'error' || competitors.status === 'error') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <ErrorState error={detailState.error ?? competitors.error} onRetry={detailState.retry} />
        <p className="mt-6 text-center text-sm">
          <Link to="/" className="text-muted underline underline-offset-2 hover:text-fg">← Back to search</Link>
        </p>
      </div>
    )
  }

  const d = detail!
  const cfg = SPORTS[d.sport]
  const [aId, bId] = d.competitorIds

  return (
    <div className="mx-auto max-w-6xl px-4 py-8" style={{ ['--accent' as string]: cfg.accent, ['--accent-soft' as string]: cfg.accentSoft }}>
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: `${nameOf(aId)} vs ${nameOf(bId)}`, to: matchupPath(d.sport, aId, bId) },
          { label: formatDate(d.date) },
        ]}
      />

      <MatchHeader detail={d} get={get} />

      <nav aria-label="Match sections" className="sticky top-14 z-30 -mx-4 mt-6 border-b border-line bg-ink/80 px-4 backdrop-blur-xl">
        <ul className="flex gap-1 overflow-x-auto py-2 text-sm">
          {SECTIONS.map(([anchor, label]) => (
            <li key={anchor}>
              <a href={`#${anchor}`} className="block shrink-0 rounded-lg px-3 py-1.5 whitespace-nowrap text-muted transition hover:bg-surface-3 hover:text-fg">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <section id="summary" className="scroll-mt-32 pt-8">
        <SectionHeading title="What happened?" eyebrow="Match summary" />
        <Card>
          <div className="space-y-4 text-[15px] leading-relaxed text-fg/90">
            {narrative.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <p className="mt-5 border-t border-line pt-4 text-xs text-faint">
            Every sentence above is assembled from fields in the data source. Nothing is added beyond the recorded data.
            {d.source.isDemo && ' This match is fictional demo data.'}
          </p>
        </Card>
      </section>

      <div className="grid gap-8 pt-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section id="stats" className="min-w-0 scroll-mt-32">
          <SectionHeading title="Match statistics" eyebrow={cfg.label} />
          <Card>
            <ErrorBoundary resetKey={d.id}>
              <SportStats key={d.id} detail={d} get={get} />
            </ErrorBoundary>
          </Card>
        </section>

        <section id="timeline" className="min-w-0 scroll-mt-32">
          <SectionHeading title="Timeline" eyebrow="Key events" />
          {timeline.length > 1 ? (
            <Timeline events={timeline} get={get} sides={[aId, bId]} />
          ) : (
            <NotAvailable what="Event timeline" />
          )}
          <p className="mt-4 text-xs text-faint">Only events recorded in the data source are shown.</p>
        </section>
      </div>

      <div id="analysis" className="scroll-mt-32 pt-10">
        {analysis.status === 'success' && analysis.data ? (
          <AnalysisSection analysis={analysis.data} />
        ) : analysis.status === 'error' ? (
          <ErrorState error={analysis.error} onRetry={analysis.retry} />
        ) : (
          <Skeleton className="h-64 w-full rounded-3xl" />
        )}
      </div>

      <Card className="mt-10 text-xs text-muted">
        <p>
          <b className="text-fg">Data source:</b>{' '}
          {d.source.url ? (
            <a href={d.source.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-fg">{d.source.provider}</a>
          ) : d.source.provider}
          {d.sport === 'football' && !d.source.isDemo && ' — event data loaded live from StatsBomb’s public repository.'}
          {d.source.isDemo && ' — fictional demonstration data. Team and fighter names are real; players, events, scores and statistics are invented for the prototype.'}
        </p>
      </Card>
    </div>
  )
}
