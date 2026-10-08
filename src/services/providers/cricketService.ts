import { DATA_PROVIDER } from './config'
import type { SportProvider } from './SportProvider'
import { StaticProvider } from './StaticProvider'

/**
 * Cricket provider: Cricsheet ball-by-ball open data, converted by scripts/data/buildCricket.ts.
 * The demo fixtures are loaded lazily only when VITE_DATA_PROVIDER=mock.
 */
export async function createCricketService(): Promise<SportProvider> {
  if (DATA_PROVIDER === 'mock') {
    const [{ MockProvider }, data] = await Promise.all([import('./MockProvider'), import('@/data/mock')])
    return new MockProvider({ sport: 'cricket', competitors: data.mockCompetitors, details: data.cricketDetails, summariesOnly: data.cricketSummariesOnly })
  }
  return new StaticProvider('cricket', 'Cricsheet open data')
}
