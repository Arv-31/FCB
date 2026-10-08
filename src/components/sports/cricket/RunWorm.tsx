import { useMemo, useState, type PointerEvent } from 'react'
import type { Innings } from '@/types'

/** Validated categorical pair for the dark surface (dataviz palette slots 1–2). */
const SERIES = ['#3987e5', '#d95926']
const W = 640
const H = 260
const PAD = { l: 40, r: 64, t: 12, b: 28 }

interface Series {
  label: string
  color: string
  cumulative: number[] // runs after each over
  wickets: number[] // wickets in each over
}

/**
 * "Worm": cumulative runs by over for each innings. Only for limited-overs matches
 * with ball-by-ball data (runsPerOver). Hover shows both teams at the same over.
 */
export function RunWorm({ innings, label }: { innings: Innings[]; label: (inn: Innings) => string }) {
  const series: Series[] = useMemo(
    () =>
      innings.slice(0, 2).map((inn, i) => {
        let sum = 0
        return {
          label: label(inn),
          color: SERIES[i],
          cumulative: (inn.runsPerOver ?? []).map((r) => (sum += r)),
          wickets: inn.wicketsPerOver ?? [],
        }
      }),
    [innings, label],
  )
  const [hover, setHover] = useState<number | null>(null)
  const [showTable, setShowTable] = useState(false)

  const maxOvers = Math.max(innings[0]?.maxOvers ?? 0, ...series.map((s) => s.cumulative.length))
  const maxRuns = Math.max(10, ...series.flatMap((s) => s.cumulative))
  const yMax = Math.ceil(maxRuns / 50) * 50
  const x = (over: number) => PAD.l + (over / maxOvers) * (W - PAD.l - PAD.r)
  const y = (runs: number) => H - PAD.b - (runs / yMax) * (H - PAD.t - PAD.b)
  const yTicks = Array.from({ length: 5 }, (_, i) => Math.round((yMax / 4) * i))
  const xStep = maxOvers > 20 ? 10 : 5
  const xTicks = Array.from({ length: Math.floor(maxOvers / xStep) + 1 }, (_, i) => i * xStep)

  const path = (s: Series) => ['M', x(0), y(0), ...s.cumulative.flatMap((r, i) => ['L', x(i + 1), y(r)])].join(' ')

  const onMove = (e: PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const rel = (e.clientX - rect.left) / rect.width
    const over = Math.round(rel * maxOvers)
    setHover(Math.min(Math.max(over, 1), maxOvers))
  }

  return (
    <figure className="mt-2">
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-muted" aria-label="Legend">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full border-2 border-fg bg-ink" /> wicket
        </span>
        <button onClick={() => setShowTable((v) => !v)} className="ml-auto text-faint underline-offset-2 hover:text-fg hover:underline">
          {showTable ? 'Show chart' : 'Show table'}
        </button>
      </div>

      {showTable ? (
        <div className="scroll-x max-h-80 overflow-y-auto">
          <table className="w-full text-xs tabular">
            <thead className="sticky top-0 bg-surface text-faint">
              <tr>
                <th className="py-1 text-left font-medium">Over</th>
                {series.map((s) => <th key={s.label} className="py-1 text-right font-medium">{s.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxOvers }, (_, i) => (
                <tr key={i} className="border-t border-line/50">
                  <td className="py-1">{i + 1}</td>
                  {series.map((s) => (
                    <td key={s.label} className="py-1 text-right">
                      {s.cumulative[i] !== undefined ? `${s.cumulative[i]}${s.wickets[i] ? ` (${s.wickets[i]} wkt)` : ''}` : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Run progression: ${series.map((s) => `${s.label} ${s.cumulative.at(-1) ?? 0} runs`).join(', ')}`}>
            {yTicks.map((t) => (
              <g key={t}>
                <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="rgb(255 255 255 / 0.07)" />
                <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--color-faint)">{t}</text>
              </g>
            ))}
            {xTicks.map((t) => (
              <text key={t} x={x(t)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--color-faint)">{t}</text>
            ))}
            <text x={W - PAD.r} y={H - 8} textAnchor="start" dx="6" fontSize="11" fill="var(--color-faint)">overs</text>

            {series.map((s) => (
              <g key={s.label}>
                <path d={path(s)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                {s.wickets.map((w, i) =>
                  w ? <circle key={i} cx={x(i + 1)} cy={y(s.cumulative[i])} r="4" fill="var(--color-ink)" stroke={s.color} strokeWidth="2" /> : null,
                )}
                {s.cumulative.length > 0 && (
                  <text x={x(s.cumulative.length) + 8} y={y(s.cumulative.at(-1)!) + 4} fontSize="11" fontWeight="600" fill="var(--color-fg)">
                    {s.cumulative.at(-1)}
                  </text>
                )}
              </g>
            ))}

            {hover !== null && (
              <g pointerEvents="none">
                <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="rgb(255 255 255 / 0.3)" />
                {series.map((s) =>
                  s.cumulative[hover - 1] !== undefined ? (
                    <circle key={s.label} cx={x(hover)} cy={y(s.cumulative[hover - 1])} r="4.5" fill={s.color} stroke="var(--color-surface)" strokeWidth="2" />
                  ) : null,
                )}
              </g>
            )}
            <rect x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setHover(null)} />
          </svg>
          {hover !== null && (
            <div
              className="pointer-events-none absolute top-2 rounded-lg border border-line-strong bg-surface-2/95 px-3 py-2 text-xs shadow-xl"
              style={{ left: `${(x(hover) / W) * 100}%`, transform: x(hover) > W / 2 ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)' }}
            >
              <p className="mb-1 font-semibold text-fg">After {hover} overs</p>
              {series.map((s) => (
                <p key={s.label} className="flex items-center gap-2 text-muted tabular">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.label}: <span className="text-fg">{s.cumulative[hover - 1] ?? '—'}</span>
                  {s.wickets[hover - 1] ? <span className="text-faint">({s.wickets[hover - 1]} wkt in over)</span> : null}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </figure>
  )
}
