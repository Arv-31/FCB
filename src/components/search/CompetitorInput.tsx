import { useEffect, useId, useRef, useState } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import { sportsService } from '@/services/sportsService'
import type { Competitor, SportId } from '@/types'
import { CompetitorAvatar } from '../ui/CompetitorAvatar'

interface Props {
  sport: SportId
  label: string
  placeholder: string
  value: string
  selected: Competitor | null
  error?: string
  onTextChange: (text: string) => void
  onSelect: (c: Competitor) => void
  /** Called when the user pastes/types "A vs B" so the form can split it. */
  onMatchupText?: (text: string) => boolean
}

export function CompetitorInput({ sport, label, placeholder, value, selected, error, onTextChange, onSelect, onMatchupText }: Props) {
  const id = useId()
  const listId = `${id}-list`
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [suggestions, setSuggestions] = useState<Competitor[]>([])
  const query = useDebounce(value, 180)
  const blurTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    let live = true
    if (!query.trim() || selected?.name === query) {
      setSuggestions([])
      return
    }
    sportsService
      .suggest(sport, query)
      .then((s) => live && (setSuggestions(s), setActive(0)))
      .catch(() => live && setSuggestions([]))
    return () => {
      live = false
    }
  }, [query, sport, selected])

  const choose = (c: Competitor) => {
    onSelect(c)
    setOpen(false)
  }

  const showList = open && suggestions.length > 0

  return (
    <div className="relative min-w-0 flex-1">
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted">
        {label}
      </label>
      <div
        className={`flex items-center gap-2 rounded-xl border bg-surface-2 px-3 transition focus-within:border-[var(--accent)] ${error ? 'border-loss/60' : 'border-line-strong'}`}
      >
        {selected ? <CompetitorAvatar competitor={selected} size="sm" /> : null}
        <input
          id={id}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList ? `${listId}-${active}` : undefined}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          autoComplete="off"
          spellCheck={false}
          className="h-12 w-full min-w-0 bg-transparent text-base outline-none placeholder:text-faint"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onTextChange(e.target.value)
            setOpen(true)
          }}
          onPaste={(e) => {
            // Pasting "India vs Australia" fills both fields at once.
            if (onMatchupText?.(e.clipboardData.getData('text'))) e.preventDefault()
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 120)
          }}
          onKeyDown={(e) => {
            if (!showList) return
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((i) => (i + 1) % suggestions.length)
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((i) => (i - 1 + suggestions.length) % suggestions.length)
            } else if (e.key === 'Enter' || e.key === 'Tab') {
              if (suggestions[active] && suggestions[active].id !== selected?.id) {
                if (e.key === 'Enter') e.preventDefault()
                choose(suggestions[active])
              }
            } else if (e.key === 'Escape') {
              setOpen(false)
            }
          }}
        />
      </div>
      {error && (
        <p id={`${id}-err`} className="mt-1.5 text-xs text-loss">
          {error}
        </p>
      )}
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-line-strong bg-surface-2 py-1 shadow-2xl shadow-black/50"
        >
          {suggestions.map((c, i) => (
            <li
              key={c.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault()
                clearTimeout(blurTimer.current)
                choose(c)
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm ${i === active ? 'bg-surface-3' : ''}`}
            >
              <CompetitorAvatar competitor={c} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{c.name}</span>
                {c.subtitle && <span className="block truncate text-xs text-faint">{c.subtitle}</span>}
              </span>
              {c.matchCount !== undefined && <span className="shrink-0 text-[11px] text-faint tabular">{c.matchCount} {c.kind === 'fighter' ? 'fights' : 'matches'}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
