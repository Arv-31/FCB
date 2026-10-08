import { Link } from 'react-router'

export interface Crumb {
  label: string
  to?: string
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5 text-sm">
      <ol className="flex flex-wrap items-center gap-1.5 text-muted">
        {items.map((c, i) => (
          <li key={i} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && <span className="text-faint" aria-hidden>/</span>}
            {c.to ? (
              <Link to={c.to} className="truncate hover:text-fg">{c.label}</Link>
            ) : (
              <span aria-current="page" className="truncate text-fg">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
