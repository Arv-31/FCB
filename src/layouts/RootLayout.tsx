import { Suspense, type ReactNode } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { sportsService } from '@/services/sportsService'

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/matches', label: 'Matches', end: false },
  { to: '/about', label: 'About', end: false },
]

function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-muted">
      {children}
    </a>
  )
}

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tight" aria-label="MatchIntel home">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 via-sky-400 to-rose-400 text-ink">
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 17 9 7l4 7 3-5 5 8" />
        </svg>
      </span>
      <span className="text-[17px]">
        Match<span className="text-muted">Intel</span>
      </span>
    </Link>
  )
}

export function RootLayout() {
  const location = useLocation()
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-surface-3 focus:px-3 focus:py-2">
        Skip to content
      </a>
      {sportsService.isDemo && (
        <div className="border-b border-demo/20 bg-demo/[0.06] px-4 py-1.5 text-center text-[11px] text-demo/90 sm:text-xs">
          Demo mode · matches shown are <b>fictional demo data</b>.{' '}
          <Link to="/about#data" className="underline underline-offset-2 hover:text-demo">Learn more</Link>
        </div>
      )}
      <header className="sticky top-0 z-40 border-b border-line bg-ink/75 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Logo />
          <nav aria-label="Main">
            <ul className="flex items-center gap-1 text-sm">
              {NAV.map((n) => (
                <li key={n.to}>
                  <NavLink
                    to={n.to}
                    end={n.end}
                    className={({ isActive }) =>
                      `rounded-lg px-3 py-1.5 font-medium transition ${isActive ? 'bg-surface-3 text-fg' : 'text-muted hover:text-fg'}`
                    }
                  >
                    {n.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1">
        <ErrorBoundary resetKey={location.pathname}>
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>

      <footer className="mt-16 border-t border-line">
        <div className="mx-auto max-w-6xl space-y-2 px-4 py-8 text-xs text-faint">
          <p>
            Data: cricket from <ExtLink href="https://cricsheet.org">Cricsheet</ExtLink> (Open Data Commons Attribution License) ·
            football from <ExtLink href="https://github.com/statsbomb/open-data">StatsBomb Open Data</ExtLink> ·
            UFC from <ExtLink href="http://ufcstats.com">UFCStats.com</ExtLink> via <ExtLink href="https://github.com/Greco1899/scrape_ufc_stats">scrape_ufc_stats</ExtLink> ·
            images from <ExtLink href="https://www.thesportsdb.com">TheSportsDB</ExtLink> (non-commercial).
          </p>
          <p>AI Match Analysis is automated interpretation of that data, not official statistics. MatchIntel is an independent, non-commercial project and is not affiliated with any league, team or data provider.</p>
        </div>
      </footer>
      <ScrollRestoration />
    </div>
  )
}
