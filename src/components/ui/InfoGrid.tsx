import type { ReactNode } from 'react'

export interface InfoItem {
  label: string
  value: ReactNode | undefined | null
}

/** Key facts grid; missing values show the standard "not available" wording. */
export function InfoGrid({ items }: { items: InfoItem[] }) {
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {items.map(({ label, value }) => (
        <div key={label} className="rounded-xl border border-line bg-surface-2/50 px-3 py-2.5">
          <dt className="text-[11px] font-medium tracking-wide text-faint uppercase">{label}</dt>
          <dd className={`mt-1 text-sm ${value == null || value === '' ? 'text-faint italic' : 'font-semibold'}`}>
            {value == null || value === '' ? 'Not available from source' : value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function SubHeading({ children }: { children: ReactNode }) {
  return <h3 className="mb-3 mt-7 text-sm font-semibold tracking-wide text-muted uppercase first:mt-0">{children}</h3>
}

export function Table({ head, children, align, compact }: { head: string[]; children: ReactNode; align?: ('l' | 'r')[]; compact?: boolean }) {
  return (
    <div className="scroll-x -mx-1 px-1">
      <table className={`w-full border-collapse ${compact ? '' : 'min-w-[520px]'} text-sm tabular`}>
        <thead>
          <tr className="border-b border-line-strong text-[11px] tracking-wide text-faint uppercase">
            {head.map((h, i) => (
              <th key={h} scope="col" className={`py-2 font-medium ${(align?.[i] ?? (i === 0 ? 'l' : 'r')) === 'l' ? 'text-left' : 'text-right'} ${i > 0 ? 'pl-3' : ''}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
