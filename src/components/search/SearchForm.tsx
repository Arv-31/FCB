import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { SPORTS, SPORT_LIST } from '@/config/sports'
import { useRecentSearches } from '@/hooks/useRecentSearches'
import { splitMatchup } from '@/services/search/resolver'
import { sportsService } from '@/services/sportsService'
import type { Competitor, SportId } from '@/types'
import { SportIcon } from '../ui/SportIcon'
import { CompetitorInput } from './CompetitorInput'

type SideError = { message: string; candidates?: Competitor[] }

export function matchupPath(sport: SportId, aId: string, bId: string, date?: string) {
  return `/matchup/${sport}/${aId}/${bId}${date ? `?date=${date}` : ''}`
}

export function SearchForm() {
  const navigate = useNavigate()
  const { add } = useRecentSearches()
  const [sport, setSport] = useState<SportId>('cricket')
  const [aText, setAText] = useState('')
  const [bText, setBText] = useState('')
  const [aSel, setASel] = useState<Competitor | null>(null)
  const [bSel, setBSel] = useState<Competitor | null>(null)
  const [date, setDate] = useState('')
  const [errors, setErrors] = useState<{ a?: SideError; b?: SideError; form?: string }>({})
  const [busy, setBusy] = useState(false)
  const cfg = SPORTS[sport]

  const changeSport = (s: SportId) => {
    setSport(s)
    setASel(null)
    setBSel(null)
    setErrors({})
  }

  const handleMatchupText = (text: string) => {
    const parts = splitMatchup(text)
    if (!parts) return false
    setAText(parts[0])
    setBText(parts[1])
    setASel(null)
    setBSel(null)
    return true
  }

  async function resolveSide(text: string, sel: Competitor | null, s: SportId): Promise<Competitor | SideError> {
    if (sel && sel.name === text) return sel
    if (!text.trim()) return { message: `Enter a ${SPORTS[s].competitorNoun.toLowerCase()}.` }
    const r = await sportsService.resolve(s, text)
    if (r.status === 'resolved') return r.competitor
    if (r.status === 'ambiguous') return { message: 'Several matches — did you mean:', candidates: r.candidates }
    // Helpful hint if the name belongs to another sport.
    for (const other of SPORT_LIST) {
      if (other.id === s) continue
      const o = await sportsService.resolve(other.id, text)
      if (o.status === 'resolved') return { message: `“${text}” wasn’t found in ${SPORTS[s].label}, but exists in ${other.label}.` }
    }
    return { message: `No ${SPORTS[s].competitorNoun.toLowerCase()} matching “${text}” in the current data source.` }
  }

  async function run(s: SportId, a: string, b: string, aPick: Competitor | null, bPick: Competitor | null) {
    setBusy(true)
    setErrors({})
    try {
      // Resolve both names together first: "Makhachev vs Oliveira" picks the Oliveira who fought Makhachev.
      if (a.trim() && b.trim()) {
        const pair = await sportsService.resolvePair(s, aPick?.name === a ? aPick.name : a, bPick?.name === b ? bPick.name : b)
        if (pair.status === 'ok' && pair.a.id !== pair.b.id) {
          const ca = aPick?.name === a ? aPick : pair.a
          const cb = bPick?.name === b ? bPick : pair.b
          add({ sport: s, aId: ca.id, bId: cb.id, aName: ca.name, bName: cb.name })
          navigate(matchupPath(s, ca.id, cb.id, date || undefined))
          return
        }
      }
      const [ra, rb] = await Promise.all([resolveSide(a, aPick, s), resolveSide(b, bPick, s)])
      const errs: typeof errors = {}
      if ('message' in ra) errs.a = ra
      if ('message' in rb) errs.b = rb
      if (!errs.a && !errs.b && (ra as Competitor).id === (rb as Competitor).id) errs.form = 'Pick two different competitors.'
      if (errs.a || errs.b || errs.form) {
        setErrors(errs)
        return
      }
      const ca = ra as Competitor
      const cb = rb as Competitor
      add({ sport: s, aId: ca.id, bId: cb.id, aName: ca.name, bName: cb.name })
      navigate(matchupPath(s, ca.id, cb.id, date || undefined))
    } catch {
      setErrors({ form: 'Search failed — the data source could not be reached. Please try again.' })
    } finally {
      setBusy(false)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    // "Madrid vs Barca" typed into one field: split it on submit.
    const typed = !bText.trim() ? splitMatchup(aText) : !aText.trim() ? splitMatchup(bText) : null
    if (typed) {
      setAText(typed[0])
      setBText(typed[1])
      run(sport, typed[0], typed[1], null, null)
      return
    }
    run(sport, aText, bText, aSel, bSel)
  }

  const runExample = (s: SportId, a: string, b: string) => {
    changeSport(s)
    setAText(a)
    setBText(b)
    run(s, a, b, null, null)
  }

  const candidateButtons = (side: 'a' | 'b') =>
    errors[side]?.candidates?.map((c) => (
      <button
        key={c.id}
        type="button"
        className="mr-2 mt-1 rounded-md border border-line-strong px-2 py-0.5 text-xs hover:bg-surface-3"
        onClick={() => {
          if (side === 'a') (setASel(c), setAText(c.name))
          else (setBSel(c), setBText(c.name))
          setErrors((e) => ({ ...e, [side]: undefined }))
        }}
      >
        {c.name}
      </button>
    ))

  return (
    <div style={{ ['--accent' as string]: cfg.accent, ['--accent-soft' as string]: cfg.accentSoft }}>
      <form onSubmit={onSubmit} className="rounded-3xl border border-line-strong bg-surface/90 p-4 shadow-2xl shadow-black/40 backdrop-blur sm:p-6" aria-label="Search a matchup">
        <div role="radiogroup" aria-label="Sport" className="mb-5 grid grid-cols-3 gap-1 rounded-2xl bg-ink/60 p-1">
          {SPORT_LIST.map((s) => {
            const on = s.id === sport
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => changeSport(s.id)}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${on ? 'bg-surface-3 shadow' : 'text-muted hover:text-fg'}`}
                style={on ? { color: s.accent } : undefined}
              >
                <SportIcon sport={s.id} />
                {s.label}
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-start">
          <div className="min-w-0 flex-1">
            <CompetitorInput
              sport={sport}
              label={`${cfg.competitorNoun} A`}
              placeholder={cfg.examples[0][0]}
              value={aText}
              selected={aSel}
              error={errors.a?.message}
              onTextChange={(t) => (setAText(t), setASel(null))}
              onSelect={(c) => (setASel(c), setAText(c.name), setErrors((e) => ({ ...e, a: undefined })))}
              onMatchupText={handleMatchupText}
            />
            {candidateButtons('a')}
          </div>
          <div className="hidden select-none pt-9 text-sm font-black tracking-widest text-faint md:block">VS</div>
          <div className="min-w-0 flex-1">
            <CompetitorInput
              sport={sport}
              label={`${cfg.competitorNoun} B`}
              placeholder={cfg.examples[0][1]}
              value={bText}
              selected={bSel}
              error={errors.b?.message}
              onTextChange={(t) => (setBText(t), setBSel(null))}
              onSelect={(c) => (setBSel(c), setBText(c.name), setErrors((e) => ({ ...e, b: undefined })))}
              onMatchupText={handleMatchupText}
            />
            {candidateButtons('b')}
          </div>
          <div className="md:w-44">
            <label htmlFor="match-date" className="mb-1.5 block text-xs font-medium text-muted">
              Date <span className="text-faint">(optional)</span>
            </label>
            <input
              id="match-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-12 w-full rounded-xl border border-line-strong bg-surface-2 px-3 text-sm text-fg [color-scheme:dark] outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>

        {errors.form && <p className="mt-3 text-sm text-loss" role="alert">{errors.form}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base font-bold text-ink transition hover:brightness-110 disabled:opacity-60"
          style={{ background: cfg.accent }}
        >
          {busy ? 'Searching…' : 'Search head-to-head'}
        </button>
      </form>

      <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-faint">Try:</span>
        {[
          ['cricket', 'India', 'Australia'],
          ['football', 'Real Madrid', 'Barcelona'],
          ['ufc', 'Islam Makhachev', 'Charles Oliveira'],
          ['cricket', 'IND', 'AUS'],
          ['football', 'Madrid', 'Barca'],
          ['ufc', 'Makhachev', 'Oliveira'],
        ].map(([s, a, b]) => (
          <button
            key={`${s}${a}`}
            type="button"
            onClick={() => runExample(s as SportId, a, b)}
            className="rounded-full border border-line bg-surface/70 px-3 py-1.5 text-muted transition hover:border-line-strong hover:text-fg"
          >
            <span style={{ color: SPORTS[s as SportId].accent }}>●</span> {a} <span className="text-faint">vs</span> {b}
          </button>
        ))}
      </div>
    </div>
  )
}
