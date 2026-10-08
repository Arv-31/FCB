import type { ReactNode } from 'react'
import type { DataSourceInfo, SportId } from '@/types'
import { SPORTS } from '@/config/sports'
import { SportIcon } from './SportIcon'

export function DemoBadge({ source, className = '' }: { source?: DataSourceInfo; className?: string }) {
  if (source && !source.isDemo) return null
  return (
    <span
      title="Fictional demonstration data — not real match results"
      className={`inline-flex items-center gap-1 rounded-full border border-demo/40 bg-demo/10 px-2 py-0.5 text-[10px] font-bold tracking-widest text-demo uppercase ${className}`}
    >
      Demo data
    </span>
  )
}

export function SportBadge({ sport }: { sport: SportId }) {
  const cfg = SPORTS[sport]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ color: cfg.accent, background: cfg.accentSoft }}
    >
      <SportIcon sport={sport} className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  )
}

export function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-md border border-line bg-surface-2 px-2 py-0.5 text-xs text-muted">{children}</span>
}
