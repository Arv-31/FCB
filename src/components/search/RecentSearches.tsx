import { Link } from 'react-router'
import { SPORTS } from '@/config/sports'
import { useRecentSearches } from '@/hooks/useRecentSearches'
import { SportIcon } from '../ui/SportIcon'
import { matchupPath } from './SearchForm'

export function RecentSearches() {
  const { items, clear } = useRecentSearches()
  if (items.length === 0) {
    return <p className="text-sm text-faint">Your recent matchup searches will appear here. They’re stored only in this browser.</p>
  }
  return (
    <div>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((r) => (
          <li key={`${r.sport}${r.aId}${r.bId}`}>
            <Link
              to={matchupPath(r.sport, r.aId, r.bId)}
              className="group flex items-center gap-3 rounded-xl border border-line bg-surface/70 px-3 py-2.5 transition hover:-translate-y-0.5 hover:border-line-strong"
            >
              <span className="rounded-lg p-1.5" style={{ color: SPORTS[r.sport].accent, background: SPORTS[r.sport].accentSoft }}>
                <SportIcon sport={r.sport} />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {r.aName} <span className="text-faint">vs</span> {r.bName}
              </span>
              <span className="text-faint transition group-hover:translate-x-0.5 group-hover:text-fg" aria-hidden>
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <button onClick={clear} className="mt-3 text-xs text-faint underline-offset-2 hover:text-muted hover:underline">
        Clear recent searches
      </button>
    </div>
  )
}
