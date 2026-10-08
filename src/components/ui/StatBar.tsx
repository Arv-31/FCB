interface StatBarProps {
  label: string
  values?: [number, number]
  format?: (v: number) => string
  colors: [string, string]
  /** For stats where lower is better (fouls), highlight the smaller value. */
  lowerIsBetter?: boolean
}

/** Two-sided comparison bar used across sports. Renders a "not available" row when missing. */
export function StatBar({ label, values, format = (v) => String(v), colors, lowerIsBetter }: StatBarProps) {
  if (!values) {
    return (
      <div className="py-2.5">
        <div className="flex items-center justify-between text-sm">
          <span className="w-16 text-faint">—</span>
          <span className="text-center text-xs text-muted">{label}</span>
          <span className="w-16 text-right text-faint">—</span>
        </div>
        <p className="mt-1 text-center text-[11px] text-faint">Not available from the current data source</p>
      </div>
    )
  }
  const [a, b] = values
  const total = a + b || 1
  const aBetter = lowerIsBetter ? a < b : a > b
  const bBetter = lowerIsBetter ? b < a : b > a
  return (
    <div className="py-2.5">
      <div className="mb-1.5 flex items-center justify-between text-sm tabular">
        <span className={`w-16 font-semibold ${aBetter ? 'text-fg' : 'text-muted'}`}>{format(a)}</span>
        <span className="text-center text-xs text-muted">{label}</span>
        <span className={`w-16 text-right font-semibold ${bBetter ? 'text-fg' : 'text-muted'}`}>{format(b)}</span>
      </div>
      <div className="flex h-1.5 gap-1 overflow-hidden rounded-full" role="img" aria-label={`${label}: ${format(a)} to ${format(b)}`}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(a / total) * 100}%`, background: colors[0], opacity: aBetter ? 1 : 0.45 }} />
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(b / total) * 100}%`, background: colors[1], opacity: bBetter ? 1 : 0.45 }} />
      </div>
    </div>
  )
}
