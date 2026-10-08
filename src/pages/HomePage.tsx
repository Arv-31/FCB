import { Link } from 'react-router'
import { RecentSearches } from '@/components/search/RecentSearches'
import { SearchForm } from '@/components/search/SearchForm'
import { SectionHeading } from '@/components/ui/Card'
import { SportIcon } from '@/components/ui/SportIcon'
import { SPORT_LIST } from '@/config/sports'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { sportsService } from '@/services/sportsService'
import type { SportId } from '@/types'
import { yearOf } from '@/utils/format'

/** "9,897 matches · 2005–2026", straight from the dataset's meta.json. */
function DatasetLine({ sport }: { sport: SportId }) {
  const meta = useAsync(() => sportsService.meta(sport), [sport])
  if (meta.status !== 'success' || !meta.data) return null
  const m = meta.data
  return (
    <p className="mt-3 text-xs text-faint tabular">
      {m.matches.toLocaleString('en-GB')} {sport === 'ufc' ? 'fights' : 'matches'}
      {m.oldest && m.newest ? ` · ${yearOf(m.oldest)}–${yearOf(m.newest)}` : ''}
    </p>
  )
}

export default function HomePage() {
  useDocumentTitle('Search a matchup')
  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="pt-12 pb-10 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface/70 px-3 py-1 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-win" /> Cricket · Football · UFC
          </p>
          <h1 className="text-4xl font-black tracking-tight text-balance sm:text-6xl">
            Every meeting.{' '}
            <span className="bg-gradient-to-r from-emerald-300 via-sky-300 to-rose-300 bg-clip-text text-transparent">Every detail.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted sm:text-lg">
            Search any two teams or fighters to see their head-to-head history, then open a match for the full story, statistics, timeline and AI analysis.
          </p>
        </div>
        <div className="mx-auto mt-10 max-w-4xl">
          <SearchForm />
        </div>
      </section>

      <section className="py-8" aria-labelledby="recent">
        <SectionHeading title="Recent searches" eyebrow="Pick up where you left off" />
        <RecentSearches />
      </section>

      <section className="py-8" aria-label="Browse by sport">
        <SectionHeading title="Browse by sport" action={<Link to="/matches" className="text-sm text-muted hover:text-fg">All matches →</Link>} />
        <div className="grid gap-3 sm:grid-cols-3">
          {SPORT_LIST.map((s) => (
            <Link
              key={s.id}
              to={`/matches?sport=${s.id}`}
              className="group relative overflow-hidden rounded-2xl border border-line bg-surface p-5 transition hover:-translate-y-0.5 hover:border-line-strong"
              style={{ backgroundImage: `radial-gradient(300px 120px at 100% 0%, ${s.accentSoft}, transparent)` }}
            >
              <span className="mb-6 inline-flex rounded-xl p-2.5" style={{ color: s.accent, background: s.accentSoft }}>
                <SportIcon sport={s.id} className="h-6 w-6" />
              </span>
              <p className="text-lg font-bold">{s.label}</p>
              <p className="mt-1 text-sm text-muted">
                {s.examples[0][0]} vs {s.examples[0][1]} and more
              </p>
              <DatasetLine sport={s.id} />
              <span className="absolute top-5 right-5 text-faint transition group-hover:translate-x-0.5 group-hover:text-fg" aria-hidden>→</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
