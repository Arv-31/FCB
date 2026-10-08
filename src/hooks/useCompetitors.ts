import { useCallback, useMemo } from 'react'
import { sportsService } from '@/services/sportsService'
import type { Competitor, SportId } from '@/types'
import { useAsync } from './useAsync'

/** Competitor directory for a sport, plus a safe id → name lookup. */
export function useCompetitors(sport: SportId) {
  const state = useAsync(() => sportsService.listCompetitors(sport), [sport])
  const byId = useMemo(() => new Map((state.data ?? []).map((c) => [c.id, c])), [state.data])
  const nameOf = useCallback((id: string) => byId.get(id)?.name ?? id, [byId])
  const get = useCallback((id: string): Competitor | undefined => byId.get(id), [byId])
  return { ...state, byId, nameOf, get }
}
