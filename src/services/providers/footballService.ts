import { DATA_PROVIDER } from './config'
import { FootballStatsBombProvider } from './FootballStatsBombProvider'
import type { SportProvider } from './SportProvider'

/**
 * Football provider: StatsBomb Open Data (match index built by scripts/data/buildFootball.ts,
 * full event data fetched in the browser when a match is opened).
 */
export async function createFootballService(): Promise<SportProvider> {
  if (DATA_PROVIDER === 'mock') {
    const [{ MockProvider }, data] = await Promise.all([import('./MockProvider'), import('@/data/mock')])
    return new MockProvider({ sport: 'football', competitors: data.mockCompetitors, details: data.footballDetails, summariesOnly: data.footballSummariesOnly })
  }
  return new FootballStatsBombProvider()
}
