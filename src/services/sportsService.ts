import type { Competitor, HeadToHead, MatchDetail, MatchSummary, SportId } from '@/types'
import { DataError } from '@/types'
import { TTLCache } from './cache'
import { DATA_PROVIDER } from './providers/config'
import type { Page, SportProvider } from './providers/SportProvider'
import type { DatasetMeta } from './providers/StaticProvider'
import { createCricketService } from './providers/cricketService'
import { createFootballService } from './providers/footballService'
import { createUFCService } from './providers/ufcService'
import { rankCompetitors, resolveCompetitor, type ResolveResult } from './search/resolver'

const MIN = 60_000

export type PairResolution =
  | { status: 'ok'; a: Competitor; b: Competitor }
  | { status: 'error'; a?: ResolveResult; b?: ResolveResult }

/**
 * SportsDataService — the only data entry point for the UI.
 * Routes each call to the sport's provider, adds caching, and computes
 * provider-independent aggregates (head-to-head record).
 */
class SportsDataService {
  private factories: Record<SportId, () => Promise<SportProvider>>
  private providers = new Map<SportId, Promise<SportProvider>>()
  private cache = new TTLCache()
  readonly isDemo = DATA_PROVIDER === 'mock'

  constructor(factories: Record<SportId, () => Promise<SportProvider>>) {
    this.factories = factories
  }

  private provider(sport: SportId): Promise<SportProvider> {
    const make = this.factories[sport]
    if (!make) return Promise.reject(new DataError('invalid-request', `Sport "${sport}" is not supported yet.`))
    let p = this.providers.get(sport)
    if (!p) this.providers.set(sport, (p = make()))
    return p
  }

  async sourceLabel(sport: SportId) {
    return (await this.provider(sport)).label
  }

  /** Dataset size/freshness, when the provider publishes it. */
  async meta(sport: SportId): Promise<DatasetMeta | undefined> {
    const p = (await this.provider(sport)) as SportProvider & { meta?: () => Promise<DatasetMeta> }
    return p.meta ? this.cache.getOrLoad(`meta:${sport}`, 30 * MIN, () => p.meta!()) : undefined
  }

  listCompetitors(sport: SportId): Promise<Competitor[]> {
    return this.cache.getOrLoad(`competitors:${sport}`, 30 * MIN, async () => (await this.provider(sport)).listCompetitors())
  }

  async getCompetitor(sport: SportId, id: string): Promise<Competitor> {
    const all = await this.listCompetitors(sport)
    const c = all.find((x) => x.id === id)
    if (!c) throw new DataError('unknown-competitor', `We couldn't find "${id}" in ${sport}.`)
    return c
  }

  async suggest(sport: SportId, query: string, limit = 6): Promise<Competitor[]> {
    if (!query.trim()) return []
    return rankCompetitors(await this.listCompetitors(sport), query, limit)
  }

  async resolve(sport: SportId, query: string): Promise<ResolveResult> {
    return resolveCompetitor(await this.listCompetitors(sport), query)
  }

  /**
   * Resolves two free-text names together. When one side is ambiguous
   * ("Oliveira"), candidates who actually met the other side are preferred.
   */
  async resolvePair(sport: SportId, aText: string, bText: string): Promise<PairResolution> {
    const [ra, rb] = await Promise.all([this.resolve(sport, aText), this.resolve(sport, bText)])
    const pick = async (amb: ResolveResult, other: Competitor) => {
      if (amb.status !== 'ambiguous') return amb
      const met: Competitor[] = []
      for (const c of amb.candidates.slice(0, 12)) {
        if ((await this.rawHeadToHead(sport, c.id, other.id)).length) met.push(c)
      }
      return met.length === 1 ? ({ status: 'resolved', competitor: met[0] } as ResolveResult) : amb
    }
    let a = ra
    let b = rb
    if (a.status === 'ambiguous' && b.status === 'resolved') a = await pick(a, b.competitor)
    if (b.status === 'ambiguous' && a.status === 'resolved') b = await pick(b, a.competitor)
    if (a.status === 'resolved' && b.status === 'resolved') return { status: 'ok', a: a.competitor, b: b.competitor }
    return { status: 'error', a, b }
  }

  private rawHeadToHead(sport: SportId, aId: string, bId: string): Promise<MatchSummary[]> {
    return this.cache.getOrLoad(`h2h:${sport}:${[aId, bId].sort().join('|')}`, 5 * MIN, async () =>
      (await this.provider(sport)).getHeadToHead(aId, bId),
    )
  }

  async getHeadToHead(sport: SportId, aId: string, bId: string): Promise<HeadToHead> {
    if (aId === bId) throw new DataError('invalid-request', 'Pick two different competitors.')
    await Promise.all([this.getCompetitor(sport, aId), this.getCompetitor(sport, bId)])
    return summarizeHeadToHead(sport, [aId, bId], await this.rawHeadToHead(sport, aId, bId))
  }

  listMatches(sport: SportId, page = 1, pageSize = 24): Promise<Page<MatchSummary>> {
    return this.cache.getOrLoad(`list:${sport}:${page}:${pageSize}`, 5 * MIN, async () =>
      (await this.provider(sport)).listMatches(page, pageSize),
    )
  }

  getMatchDetail(sport: SportId, matchId: string): Promise<MatchDetail> {
    return this.cache.getOrLoad(`detail:${sport}:${matchId}`, 10 * MIN, async () =>
      (await this.provider(sport)).getMatchDetail(matchId),
    )
  }
}

export function summarizeHeadToHead(sport: SportId, ids: [string, string], raw: MatchSummary[]): HeadToHead {
  const matches = [...raw].sort((a, b) => b.date.localeCompare(a.date))
  const wins: Record<string, number> = { [ids[0]]: 0, [ids[1]]: 0 }
  let draws = 0
  let noResults = 0
  for (const m of matches) {
    if (m.result.outcome === 'win' && m.result.winnerId) wins[m.result.winnerId] = (wins[m.result.winnerId] ?? 0) + 1
    else if (m.result.outcome === 'draw' || m.result.outcome === 'tie') draws++
    else if (m.result.outcome === 'no-result') noResults++
  }
  return {
    sport,
    competitorIds: ids,
    total: matches.length,
    wins,
    draws,
    noResults,
    latest: matches[0],
    first: matches[matches.length - 1],
    matches,
  }
}

export const sportsService = new SportsDataService({
  cricket: createCricketService,
  football: createFootballService,
  ufc: createUFCService,
})
