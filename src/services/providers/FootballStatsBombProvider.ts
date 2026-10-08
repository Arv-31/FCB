import type { FootballMatchDetail, MatchDetail, MatchSummary } from '@/types'
import { DataError } from '@/types'
import { fetchJson } from './http'
import { StaticProvider } from './StaticProvider'
import { buildFootballStats, refineFootballResult, statsbombUrls } from './statsbomb'

type Stub = MatchSummary & { referee?: string; managers?: [string | undefined, string | undefined] }

/**
 * Football: match index from the static dataset; full statistics fetched from
 * StatsBomb Open Data only when a match is opened (several MB per match, so never prefetched).
 */
export class FootballStatsBombProvider extends StaticProvider {
  constructor() {
    super('football', 'StatsBomb Open Data')
  }

  override async getMatchDetail(matchId: string): Promise<MatchDetail> {
    const stub = await this.detailRecord<Stub>(matchId)
    const sbId = Number(stub.ref?.statsbomb)
    if (!sbId) throw new DataError('not-found', 'No detailed event data is linked to this match.')
    const urls = statsbombUrls(sbId)
    const [events, lineups] = await Promise.all([
      fetchJson<Parameters<typeof buildFootballStats>[1]>(urls.events, 'match events from StatsBomb'),
      fetchJson<Parameters<typeof buildFootballStats>[2]>(urls.lineups, 'line-ups from StatsBomb').catch(() => []),
    ])
    const { referee: _r, managers: _m, ...summary } = stub
    const detail: FootballMatchDetail = { ...summary, sport: 'football', stats: buildFootballStats(stub, events, lineups) }
    const names = new Map((await this.listCompetitors()).map((c) => [c.id, c.name]))
    return refineFootballResult(detail, (id) => names.get(id) ?? id)
  }
}
