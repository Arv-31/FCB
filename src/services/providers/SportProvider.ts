import type { Competitor, MatchDetail, MatchSummary, SportId } from '@/types'

export interface Page<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

/**
 * Contract every data source must implement (mock, football-data.org, Cricsheet, UFCStats scraper...).
 * Providers return normalized domain objects — never raw API payloads — and throw `DataError`.
 */
export interface SportProvider {
  readonly sport: SportId
  /** Name shown in the UI as the data source. */
  readonly label: string

  listCompetitors(): Promise<Competitor[]>
  getCompetitor(id: string): Promise<Competitor | undefined>
  /** All meetings between two competitors, any order. */
  getHeadToHead(aId: string, bId: string): Promise<MatchSummary[]>
  listMatches(page: number, pageSize: number): Promise<Page<MatchSummary>>
  /** Expensive call: only made when the user opens one match. */
  getMatchDetail(matchId: string): Promise<MatchDetail>
}
