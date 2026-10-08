import type { Competitor, MatchDetail, MatchSummary, SportId } from '@/types'
import { DataError } from '@/types'
import { DETAIL_BUCKETS, H2H_BUCKETS, bucketOf, pairKey } from '@/utils/hash'
import { dataUrl, fetchJson } from './http'
import type { Page, SportProvider } from './SportProvider'

export interface DatasetMeta {
  sport: SportId
  matches: number
  competitors: number
  builtAt: string
  newest?: string
  oldest?: string
}

/**
 * Reads the pre-built static dataset in public/data/<sport>/ (see scripts/data/).
 * Works on any static host — no server or API key needed.
 */
export class StaticProvider implements SportProvider {
  readonly sport: SportId
  readonly label: string
  private competitors?: Promise<Competitor[]>

  constructor(sport: SportId, label: string) {
    this.sport = sport
    this.label = label
  }

  protected file<T>(path: string, what: string) {
    return fetchJson<T>(dataUrl(`${this.sport}/${path}`), what)
  }

  meta() {
    return this.file<DatasetMeta>('meta.json', 'dataset information')
  }

  listCompetitors() {
    this.competitors ??= this.file<Competitor[]>('competitors.json', 'team list').catch((e) => {
      this.competitors = undefined // allow retry after a failure
      throw e
    })
    return this.competitors
  }

  async getCompetitor(id: string) {
    return (await this.listCompetitors()).find((c) => c.id === id)
  }

  async getHeadToHead(aId: string, bId: string) {
    const key = pairKey(aId, bId)
    const bucket = await this.file<Record<string, MatchSummary[]>>(`h2h/${bucketOf(key, H2H_BUCKETS)}.json`, 'head-to-head history')
    return bucket[key] ?? []
  }

  async listMatches(page: number): Promise<Page<MatchSummary>> {
    try {
      return await this.file<Page<MatchSummary>>(`list/${page}.json`, 'match list')
    } catch (e) {
      if (e instanceof DataError && e.kind === 'not-found') return { items: [], page, pageSize: 24, total: 0, hasMore: false }
      throw e
    }
  }

  protected async detailRecord<T>(matchId: string): Promise<T> {
    const bucket = await this.file<Record<string, T>>(`details/${bucketOf(matchId, DETAIL_BUCKETS)}.json`, 'match details')
    const d = bucket[matchId]
    if (!d) throw new DataError('not-found', 'This match could not be found in the current data source.')
    return d
  }

  getMatchDetail(matchId: string): Promise<MatchDetail> {
    return this.detailRecord<MatchDetail>(matchId)
  }
}
