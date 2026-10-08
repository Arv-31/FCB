import type { SportId } from '@/types'

/** Simple inline icons (no external icon dependency). */
export function SportIcon({ sport, className = 'h-4 w-4' }: { sport: SportId; className?: string }) {
  const common = { className, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  switch (sport) {
    case 'cricket':
      return (
        <svg {...common}>
          <path d="M4 20 15 9l2 2L6 22z" />
          <path d="m15 9 3-3 2 2-3 3" />
          <circle cx="18.5" cy="18.5" r="2" />
        </svg>
      )
    case 'football':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m12 7 4 3-1.5 4.5h-5L8 10z" />
          <path d="M12 3v4M16 10l4.5-1.5M14.5 14.5 17 19M9.5 14.5 7 19M8 10 3.5 8.5" />
        </svg>
      )
    case 'ufc':
      return (
        <svg {...common}>
          <path d="M7 11V7a2 2 0 0 1 4 0v3" />
          <path d="M11 10V6a2 2 0 0 1 4 0v4" />
          <path d="M15 10V8a2 2 0 0 1 4 0v5a7 7 0 0 1-7 7h-1a6 6 0 0 1-6-6v-2a2 2 0 0 1 2-2h4" />
        </svg>
      )
  }
}
