import { isRouteErrorResponse, useRouteError } from 'react-router'

/** Router-level error element (e.g. a lazy chunk failed to load after a deploy). */
export function RouteError() {
  const error = useRouteError()
  const status = isRouteErrorResponse(error) ? error.status : undefined
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">{status === 404 ? 'Page not found' : 'Something went wrong'}</h1>
      <p className="mt-2 text-muted">{status === 404 ? 'That page does not exist.' : 'The page failed to load. Check your connection and reload.'}</p>
      <div className="mt-6 flex justify-center gap-3">
        <button onClick={() => window.location.reload()} className="rounded-xl border border-line-strong px-5 py-2.5 text-sm font-semibold">Reload</button>
        <a href={import.meta.env.BASE_URL} className="rounded-xl bg-fg px-5 py-2.5 text-sm font-bold text-ink">Home</a>
      </div>
    </div>
  )
}
