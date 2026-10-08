export type CricketFormat = 'Test' | 'ODI' | 'T20I'

export interface BattingEntry {
  name: string
  /** "not out", "c Smith b Jones", "run out (Lee)" ... */
  dismissal: string
  runs: number
  balls: number
  fours: number
  sixes: number
}

export interface BowlingEntry {
  name: string
  overs: string // "10" or "9.2"
  maidens: number
  runs: number
  wickets: number
}

export interface FallOfWicket {
  wicket: number
  score: number
  over: string // "8.3"
  batter: string
}

export interface Partnership {
  wicket: number
  runs: number
  balls: number
  batters: [string, string]
}

export interface Extras {
  byes: number
  legByes: number
  wides: number
  noBalls: number
}

export interface Innings {
  battingTeamId: string
  /** Total runs. Must equal batting runs + extras (checked by scripts/validateData.ts). */
  runs: number
  wickets: number
  overs: string
  /** Max overs available (50 for ODI, 20 for T20I). Omitted for Tests. */
  maxOvers?: number
  target?: number
  extras?: Extras
  batting?: BattingEntry[]
  didNotBat?: string[]
  bowling?: BowlingEntry[]
  fallOfWickets?: FallOfWicket[]
  partnerships?: Partnership[]
  powerplay?: { label: string; runs: number; wickets: number }
  declared?: boolean
  forfeited?: boolean
  /** Runs scored in each over (index 0 = first over). */
  runsPerOver?: number[]
  /** Wickets that fell in each over. */
  wicketsPerOver?: number[]
}

export interface CricketKeyMoment {
  over: string
  /** Index of the innings the moment belongs to (needed for Tests, where teams bat twice). */
  innings?: number
  type: 'six' | 'four' | 'milestone' | 'review' | 'wicket' | 'note'
  teamId: string
  text: string
  major?: boolean
}

export interface CricketStats {
  format: CricketFormat
  toss?: { winnerId: string; decision: 'bat' | 'bowl' }
  playerOfTheMatch?: { name: string; teamId: string }
  innings: Innings[]
  keyMoments?: CricketKeyMoment[]
  /** "DLS" when the result used a rain-rule method. */
  method?: string
  superOvers?: { teamId: string; runs: number; wickets: number }[]
  officials?: string[]
}
