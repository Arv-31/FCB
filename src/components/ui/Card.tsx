import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padded?: boolean
}

export function Card({ children, padded = true, className = '', ...rest }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-line bg-surface/80 backdrop-blur-sm ${padded ? 'p-5 sm:p-6' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}

export function SectionHeading({ title, eyebrow, action }: { title: string; eyebrow?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-semibold tracking-[0.14em] text-[var(--accent)] uppercase">{eyebrow}</p>}
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{title}</h2>
      </div>
      {action}
    </div>
  )
}
