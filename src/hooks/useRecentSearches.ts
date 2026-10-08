import { useCallback, useState } from 'react'
import type { SportId } from '@/types'

export interface RecentSearch {
  sport: SportId
  aId: string
  bId: string
  aName: string
  bName: string
  at: number
}

const KEY = 'matchintel:recent:v1'
const MAX = 8

function load(): RecentSearch[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function save(list: RecentSearch[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* private mode / blocked storage: recent searches just won't persist */
  }
}

export function useRecentSearches() {
  const [items, setItems] = useState<RecentSearch[]>(load)

  const add = useCallback((s: Omit<RecentSearch, 'at'>) => {
    const pairKey = (x: { sport: string; aId: string; bId: string }) => `${x.sport}:${[x.aId, x.bId].sort().join('|')}`
    const next = [{ ...s, at: Date.now() }, ...load().filter((x) => pairKey(x) !== pairKey(s))].slice(0, MAX)
    save(next)
    setItems(next)
  }, [])

  const clear = useCallback(() => {
    save([])
    setItems([])
  }, [])

  return { items, add, clear }
}
