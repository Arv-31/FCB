import type { SportId } from './sport'
import type { CricketStats } from './cricket'
import type { FootballStats } from './football'
import type { UFCStats } from './ufc'

/** Any part may be missing from a real data source. */
export interface Venue {
  name?: string
  city?: string
  country?: string
}

export type OutcomeType = 'win' | 'draw' | 'no-result' | 'tie'

export interface MatchResult {
  outcome: OutcomeType
  /** Competitor id of the winner, null for draw / no result. */
  winnerId: string | null
  /** Official result text, e.g. "Australia won by 5 wickets". */
  text: string
}

export interface DataSourceInfo {
  provider: string
  /** True for fictional demonstration data. The UI must label it. */
  isDemo: boolean
  url?: string
  retrievedAt?: string
}

/** Lightweight record used in lists. Cheap to fetch. */
export interface MatchSummary {
  id: string
  sport: SportId
  date: string // ISO yyyy-mm-dd
  competition: string
  /** e.g. "ODI", "La Liga", "Lightweight" */
  stage?: string
  venue: Venue
  /** [sideA, sideB] competitor ids, in the order the match is listed (home first). */
  competitorIds: [string, string]
  /** Short score per side, e.g. ["278/8 (50)", "281/5 (48.2)"] or ["2", "1"]. Null for UFC. */
  score: [string, string] | null
  result: MatchResult
  source: DataSourceInfo
  /** Whether a detailed record exists for this match. */
  hasDetail: boolean
  /** Provider-specific identifiers needed to load details (e.g. a StatsBomb match id). */
  ref?: Record<string, string | number>
}

export type TimelineEventType =
  | 'goal' | 'own-goal' | 'penalty-goal' | 'yellow' | 'red' | 'substitution'
  | 'wicket' | 'six' | 'four' | 'milestone' | 'review' | 'innings-break'
  | 'knockdown' | 'takedown' | 'submission-attempt' | 'finish'
  | 'start' | 'end' | 'note'

export interface TimelineEvent {
  /** Display marker, e.g. "67'", "8.3 ov", "R2 3:16" */
  marker: string
  /** Numeric sort key along the match (minutes, balls, seconds). */
  order: number
  type: TimelineEventType
  title: string
  description?: string
  competitorId?: string
  /** Highlight as a momentum-changing event. */
  major?: boolean
}

export interface CricketMatchDetail extends MatchSummary { sport: 'cricket'; stats: CricketStats }
export interface FootballMatchDetail extends MatchSummary { sport: 'football'; stats: FootballStats }
export interface UFCMatchDetail extends MatchSummary { sport: 'ufc'; stats: UFCStats }

export type MatchDetail = CricketMatchDetail | FootballMatchDetail | UFCMatchDetail

export interface HeadToHead {
  sport: SportId
  competitorIds: [string, string]
  total: number
  wins: Record<string, number>
  draws: number
  noResults: number
  first?: MatchSummary
  latest?: MatchSummary
  matches: MatchSummary[] // newest first
}
