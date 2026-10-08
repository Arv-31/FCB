/** Sports supported by the app. Add a new id here + register it in config/sports.ts. */
export type SportId = 'cricket' | 'football' | 'ufc'

export type CompetitorKind = 'team' | 'fighter'

export interface Competitor {
  id: string
  sport: SportId
  kind: CompetitorKind
  name: string
  shortName: string
  /** Alternative spellings / nicknames used by the search resolver. */
  aliases: string[]
  country?: string
  /** Extra context shown in suggestions, e.g. "Women", a nickname, or a weight class. */
  subtitle?: string
  /** Number of matches in the data source — used to rank ambiguous search results. */
  matchCount?: number
  colors: { primary: string; secondary: string }
  /** Optional ids in external providers, used for exact (non-search) lookups. */
  externalIds?: Partial<Record<'thesportsdb' | 'footballData' | 'cricsheet' | 'ufcstats', string>>
}

export interface ImageAsset {
  url: string
  alt: string
  /** Human-readable credit, e.g. "TheSportsDB". Required whenever an external image is shown. */
  attribution: string
  sourceUrl?: string
}
