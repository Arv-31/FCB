import { DATA_PROVIDER } from './config'
import type { SportProvider } from './SportProvider'
import { StaticProvider } from './StaticProvider'

/**
 * UFC provider: UFCStats.com statistics (via the open scrape_ufc_stats dataset),
 * converted by scripts/data/buildUfc.ts.
 */
export async function createUFCService(): Promise<SportProvider> {
  if (DATA_PROVIDER === 'mock') {
    const [{ MockProvider }, data] = await Promise.all([import('./MockProvider'), import('@/data/mock')])
    return new MockProvider({ sport: 'ufc', competitors: data.mockCompetitors, details: data.ufcDetails })
  }
  return new StaticProvider('ufc', 'UFCStats.com')
}
