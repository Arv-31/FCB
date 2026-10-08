import type { AnalysisKey, MatchAnalysis } from '@/types'

const ORDER: AnalysisKey[] = ['decider', 'turningPoint', 'bestPerformer', 'winningStrategy', 'losingProblems', 'tacticalChanges', 'keyStats']

export function AnalysisSection({ analysis }: { analysis: MatchAnalysis }) {
  const points = ORDER.map((k) => [k, analysis.points[k]] as const).filter(([, p]) => p)

  return (
    <section aria-labelledby="ai-analysis" className="rounded-3xl border border-violet-400/25 bg-gradient-to-b from-violet-500/[0.07] to-transparent p-5 sm:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-violet-300 uppercase">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z" />
              <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
            </svg>
            AI-generated interpretation
          </p>
          <h2 id="ai-analysis" className="text-xl font-semibold tracking-tight">AI Match Analysis</h2>
        </div>
        <span className="rounded-full border border-violet-400/30 px-2.5 py-1 text-[11px] font-medium text-violet-200">Not official statistics</span>
      </div>

      {points.length === 0 ? (
        <p className="text-sm text-muted">There isn’t enough verified data for this match to produce an analysis.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {points.map(([key, p]) => (
            <article key={key} className={`rounded-2xl border border-line bg-surface/70 p-4 ${key === 'decider' ? 'md:col-span-2' : ''}`}>
              <h3 className="text-sm font-semibold text-violet-200">{p!.heading}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-fg/90">{p!.body}</p>
              {p!.evidence && p!.evidence.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-line pt-3">
                  {p!.evidence.map((e) => (
                    <li key={e} className="flex gap-2 text-xs text-muted">
                      <span className="text-faint" aria-hidden>▸</span>
                      <span className="tabular">{e}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      )}

      <p className="mt-5 text-xs leading-relaxed text-faint">
        This section is an automated interpretation of the verified match data shown on this page. Bullet points (▸) are figures taken
        directly from the data; the surrounding sentences are opinion, not official statistics. Engine: {analysis.engine}.
      </p>
    </section>
  )
}
