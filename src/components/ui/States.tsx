import type { ReactNode } from 'react'
import { DataError } from '@/types'

const COPY: Record<DataError['kind'], { title: string; hint: string }> = {
  'unknown-competitor': { title: 'We couldn’t find that team or player', hint: 'Check the spelling or try a common name, e.g. “IND”, “Barca”, “Makhachev”.' },
  'not-found': { title: 'Not available', hint: 'The current data source has no record for this.' },
  unavailable: { title: 'Data source unavailable', hint: 'The sports data provider is not responding right now. Please try again shortly.' },
  'rate-limited': { title: 'Too many requests', hint: 'The free data provider limits how often we can ask for data.' },
  network: { title: 'Network problem', hint: 'Check your internet connection and try again.' },
  'invalid-request': { title: 'That search doesn’t work', hint: 'Please adjust your search and try again.' },
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const isData = error instanceof DataError
  const copy = isData ? COPY[error.kind] : { title: 'Something went wrong', hint: 'An unexpected error occurred.' }
  const retryable = !isData || ['unavailable', 'rate-limited', 'network'].includes(error.kind)
  return (
    <div role="alert" className="rounded-2xl border border-loss/25 bg-loss/5 p-6 text-center">
      <p className="text-base font-semibold">{copy.title}</p>
      <p className="mt-1 text-sm text-muted">{isData ? error.message : copy.hint}</p>
      {isData && error.message !== copy.hint && <p className="mt-1 text-xs text-faint">{copy.hint}</p>}
      {isData && error.kind === 'rate-limited' && error.retryAfterSeconds && (
        <p className="mt-1 text-xs text-faint">Try again in about {error.retryAfterSeconds} seconds.</p>
      )}
      {retryable && onRetry && (
        <button onClick={onRetry} className="mt-4 rounded-lg border border-line-strong px-4 py-2 text-sm font-medium transition hover:bg-surface-3">
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong p-8 text-center">
      {icon && <div className="mb-3 flex justify-center text-faint">{icon}</div>}
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  )
}

/** The one standard message for missing statistics. Never replace with a guess. */
export function NotAvailable({ what, compact = false }: { what?: string; compact?: boolean }) {
  return (
    <p className={`flex items-start gap-2 text-faint ${compact ? 'text-xs' : 'rounded-xl border border-dashed border-line px-4 py-3 text-sm'}`}>
      <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16h.01" />
      </svg>
      <span>
        {what ? `${what}: this statistic isn’t available from the current data source.` : 'This statistic isn’t available from the current data source.'}
      </span>
    </p>
  )
}
