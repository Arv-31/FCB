export interface AnalysisPoint {
  heading: string
  body: string
  /** Verified figures from the data that support this point. */
  evidence?: string[]
}

export type AnalysisKey =
  | 'decider' | 'turningPoint' | 'bestPerformer' | 'winningStrategy'
  | 'losingProblems' | 'tacticalChanges' | 'keyStats'

export interface MatchAnalysis {
  engine: string
  generatedAt: string
  points: Partial<Record<AnalysisKey, AnalysisPoint>>
}
