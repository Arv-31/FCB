import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-6xl font-black text-faint">404</p>
      <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-muted">That page does not exist. Try searching for a matchup instead.</p>
      <Link to="/" className="mt-6 inline-block rounded-xl bg-fg px-5 py-2.5 text-sm font-bold text-ink hover:brightness-90">
        Search a matchup
      </Link>
    </div>
  )
}
