import type { BattingEntry, BowlingEntry, DataSourceInfo, FallOfWicket, Partnership } from '@/types'

export const DEMO_SOURCE: DataSourceInfo = {
  provider: 'MatchIntel demo dataset (fictional)',
  isDemo: true,
}

/** Compact constructors so scorecards stay readable. */
export const bat = (name: string, dismissal: string, runs: number, balls: number, fours: number, sixes: number): BattingEntry =>
  ({ name, dismissal, runs, balls, fours, sixes })

export const bowl = (name: string, overs: string, maidens: number, runs: number, wickets: number): BowlingEntry =>
  ({ name, overs, maidens, runs, wickets })

export const fow = (wicket: number, score: number, over: string, batter: string): FallOfWicket =>
  ({ wicket, score, over, batter })

export const pship = (wicket: number, runs: number, balls: number, a: string, b: string): Partnership =>
  ({ wicket, runs, balls, batters: [a, b] })
