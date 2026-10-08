import { Card } from '@/components/ui/Card'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { sportsService } from '@/services/sportsService'
import { formatDate } from '@/utils/format'

const SOURCES = [
  {
    sport: 'Cricket',
    name: 'Cricsheet',
    href: 'https://cricsheet.org',
    licence: 'Open Data Commons Attribution License',
    covers: 'Ball-by-ball data for men’s and women’s international Tests, ODIs and T20Is. Every scorecard figure here is computed from those deliveries.',
  },
  {
    sport: 'Football',
    name: 'StatsBomb Open Data',
    href: 'https://github.com/statsbomb/open-data',
    licence: 'Free for non-commercial use with attribution',
    covers: 'Event data for selected competitions: World Cups, Euros, Copa América, Champions League finals, many La Liga seasons (including ~30 Real Madrid vs Barcelona games), the 2015/16 Premier League, women’s competitions and more. It does not cover every league or recent seasons.',
  },
  {
    sport: 'UFC',
    name: 'UFCStats.com via scrape_ufc_stats',
    href: 'https://github.com/Greco1899/scrape_ufc_stats',
    licence: 'Statistics published by UFCStats.com; dataset maintained on GitHub',
    covers: 'Every UFC event with fight results, methods, round-by-round striking/grappling stats and judges’ cards. Career records are computed from these results.',
  },
  {
    sport: 'Images',
    name: 'TheSportsDB',
    href: 'https://www.thesportsdb.com',
    licence: 'Crowd-sourced, free API key for non-commercial use',
    covers: 'Club badges and fighter photos, used only when the sport and name match exactly. Otherwise a neutral monogram is shown.',
  },
]

export default function AboutPage() {
  useDocumentTitle('About')
  const meta = useAsync(() => Promise.all((['cricket', 'football', 'ufc'] as const).map((s) => sportsService.meta(s))), [])

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">About MatchIntel</h1>
      <p className="mt-4 text-lg text-muted">
        MatchIntel is “Wikipedia + ESPN + AI analysis” for a specific matchup. Pick a sport, enter two teams or fighters, see every recorded
        meeting between them, and open any match for a full summary, sport-specific statistics, a timeline of key events, and an automated analysis.
      </p>

      {meta.data && (
        <div className="mt-8 grid grid-cols-3 gap-3 text-center">
          {meta.data.map((m, i) => m && (
            <Card key={i} className="!p-4">
              <p className="text-2xl font-black tabular">{m.matches.toLocaleString('en-GB')}</p>
              <p className="text-xs text-muted">{m.sport === 'ufc' ? 'UFC fights' : `${m.sport} matches`}</p>
              {m.newest && <p className="mt-1 text-[11px] text-faint">latest {formatDate(m.newest, 'short')}</p>}
            </Card>
          ))}
        </div>
      )}

      <h2 id="data" className="mt-12 mb-3 scroll-mt-24 text-xl font-semibold">Where the data comes from</h2>
      <p className="mb-4 text-sm leading-relaxed text-muted">
        All data comes from free, openly published sources. It is converted into a compact format when the site is built and refreshed by
        rebuilding. There are no live scores: each dataset is as recent as its source’s last update.
      </p>
      <div className="space-y-3">
        {SOURCES.map((s) => (
          <Card key={s.name} className="!p-4">
            <p className="text-xs font-semibold tracking-wider text-faint uppercase">{s.sport}</p>
            <p className="mt-1 font-semibold">
              <a href={s.href} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">{s.name}</a>
              <span className="ml-2 text-xs font-normal text-faint">{s.licence}</span>
            </p>
            <p className="mt-1 text-sm text-muted">{s.covers}</p>
          </Card>
        ))}
      </div>

      <h2 className="mt-12 mb-3 text-xl font-semibold">Our accuracy rules</h2>
      <ul className="space-y-2 text-sm leading-relaxed text-muted">
        <li>• Statistics are shown only when the source provides them. Otherwise you’ll see “This statistic isn’t available from the current data source.”</li>
        <li>• Summaries and timelines are assembled from structured data fields only, so they never contain invented events. UFC timelines show per-round counts because the source has no timestamps inside rounds.</li>
        <li>• Football possession is not published by StatsBomb, so it is estimated from event timings and labelled as an estimate.</li>
        <li>
          • <b className="text-fg">AI Match Analysis</b> is labelled as interpretation, not official statistics. Every point lists the verified figures
          it is based on. It runs locally in your browser with no external AI service.
        </li>
        <li>• Known source limits: football covers only StatsBomb’s published competitions. UFC fighters who share an identical name may be merged. Where a source contradicts itself (e.g. a “unanimous” decision whose cards disagree), the data is shown as published.</li>
      </ul>

      <h2 className="mt-12 mb-3 text-xl font-semibold">Privacy</h2>
      <p className="text-sm leading-relaxed text-muted">
        Recent searches and the image cache are stored only in your browser (localStorage). There are no accounts and no tracking. Opening a
        football match loads its event file directly from StatsBomb’s public GitHub repository, and images are requested from TheSportsDB.
      </p>
    </div>
  )
}
