export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} aria-hidden />
}

export function MatchCardSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <Skeleton className="mb-4 h-3 w-1/3" />
      <div className="mb-3 flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-3 w-1/2" />
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10" aria-busy="true" aria-label="Loading">
      <Skeleton className="mb-6 h-40 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MatchCardSkeleton />
        <MatchCardSkeleton />
        <MatchCardSkeleton />
      </div>
    </div>
  )
}
