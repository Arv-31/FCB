import type { Competitor, TimelineEvent, TimelineEventType } from '@/types'

const ICON: Partial<Record<TimelineEventType, string>> = {
  goal: '⚽', 'penalty-goal': '⚽', 'own-goal': '⚽',
  yellow: '🟨', red: '🟥', substitution: '⇄',
  wicket: 'W', six: '6', four: '4', milestone: '★',
  knockdown: 'KD', takedown: 'TD', 'submission-attempt': 'SUB', finish: '✕',
  start: '▶', end: '■', 'innings-break': '‖', note: '•',
}

interface Props {
  events: TimelineEvent[]
  get: (id: string) => Competitor | undefined
  /** Competitor order so events can sit on the left/right side on wide screens. */
  sides: [string, string]
}

export function Timeline({ events, get, sides }: Props) {
  return (
    <ol className="relative space-y-3 before:absolute before:top-2 before:bottom-2 before:left-[5.125rem] before:w-px before:bg-line-strong sm:before:left-[6.125rem]">
      {events.map((e, i) => {
        const c = e.competitorId ? get(e.competitorId) : undefined
        const color = c?.colors.primary ?? 'var(--color-faint)'
        const sideIdx = e.competitorId ? sides.indexOf(e.competitorId) : -1
        return (
          <li key={`${e.order}-${i}`} className="relative flex items-start gap-3 animate-fade-up" style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
            <span className="w-14 shrink-0 pt-2 text-right text-xs font-semibold text-muted tabular sm:w-[4.5rem]">{e.marker}</span>
            <span
              className={`relative z-10 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-black ${e.major ? 'border-transparent text-ink' : 'border-line-strong bg-surface-2 text-fg'}`}
              style={e.major ? { background: 'var(--accent)' } : undefined}
              aria-hidden
            >
              {ICON[e.type] ?? '•'}
            </span>
            <div
              className={`min-w-0 flex-1 rounded-xl border px-3.5 py-2.5 ${e.major ? 'border-line-strong bg-surface-2' : 'border-line bg-surface/60'}`}
              style={sideIdx >= 0 ? { borderLeft: `3px solid ${color}` } : undefined}
            >
              <p className={`text-sm font-semibold ${e.major ? '' : 'text-fg/90'}`}>{e.title}</p>
              {e.description && <p className="mt-0.5 text-sm text-muted">{e.description}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
