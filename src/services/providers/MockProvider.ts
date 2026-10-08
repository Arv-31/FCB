import type { Competitor, MatchDetail, MatchSummary, SportId } from '@/types'
import { DataError } from '@/types'
import type { Page, SportProvider } from './SportProvider'

interface MockProviderOptions {
  sport: SportId
  competitors: Competitor[]
  details: MatchDetail[]
  summariesOnly?: MatchSummary[]
  /** Simulated network latency so loading states are exercised. */
  latencyMs?: number
}

/**
 * Developer hook for testing error UI: append `?simulate=network|rate-limit|unavailable`
 * to any URL and every mock call will fail with that error.
 */
function simulatedFailure(): DataError | null {
  if (typeof window === 'undefined') return null
  const mode = new URLSearchParams(window.location.search).get('simulate')
  switch (mode) {
    case 'network': return new DataError('network', 'Could not reach the data provider.')
    case 'rate-limit': return new DataError('rate-limited', 'The data provider rate limit was reached.', 60)
    case 'unavailable': return new DataError('unavailable', 'The data provider is temporarily unavailable.')
    default: return null
  }
}

const toSummary = (d: MatchDetail): MatchSummary => {
  // Strip heavy stats so list views never carry detail payloads.
  const { stats: _stats, ...summary } = d
  return summary
}

const byDateDesc = (a: MatchSummary, b: MatchSummary) => b.date.localeCompare(a.date)

export class MockProvider implements SportProvider {
  readonly sport: SportId
  readonly label = 'Demo dataset'
  private readonly competitors: Competitor[]
  private readonly details: Map<string, MatchDetail>
  private readonly summaries: MatchSummary[]
  private readonly latencyMs: number

  constructor(opts: MockProviderOptions) {
    this.sport = opts.sport
    this.competitors = opts.competitors.filter((c) => c.sport === opts.sport)
    this.details = new Map(opts.details.map((d) => [d.id, d]))
    this.summaries = [...opts.details.map(toSummary), ...(opts.summariesOnly ?? [])].sort(byDateDesc)
    this.latencyMs = opts.latencyMs ?? 350
  }

  private async respond<T>(value: T): Promise<T> {
    await new Promise((r) => setTimeout(r, this.latencyMs))
    const failure = simulatedFailure()
    if (failure) throw failure
    return value
  }

  listCompetitors() {
    return this.respond(this.competitors)
  }

  getCompetitor(id: string) {
    return this.respond(this.competitors.find((c) => c.id === id))
  }

  getHeadToHead(aId: string, bId: string) {
    const matches = this.summaries.filter(
      (m) => m.competitorIds.includes(aId) && m.competitorIds.includes(bId),
    )
    return this.respond(matches)
  }

  listMatches(page: number, pageSize: number): Promise<Page<MatchSummary>> {
    const start = (page - 1) * pageSize
    const items = this.summaries.slice(start, start + pageSize)
    return this.respond({ items, page, pageSize, total: this.summaries.length, hasMore: start + pageSize < this.summaries.length })
  }

  async getMatchDetail(matchId: string) {
    const detail = this.details.get(matchId)
    if (!detail) {
      const exists = this.summaries.some((m) => m.id === matchId)
      await this.respond(null)
      throw new DataError('not-found', exists
        ? 'Only the result is available for this match — no detailed record exists in the current data source.'
        : 'This match could not be found.')
    }
    return this.respond(detail)
  }
}
