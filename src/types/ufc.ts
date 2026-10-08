export type FinishMethod =
  | 'KO/TKO' | 'Submission' | 'Decision (Unanimous)' | 'Decision (Split)'
  | 'Decision (Majority)' | 'Draw' | 'No Contest' | 'DQ'

export interface Attempted { landed: number; attempted: number }

export interface FighterFightStats {
  sigStrikes?: Attempted
  totalStrikes?: Attempted
  takedowns?: Attempted
  submissionAttempts?: number
  knockdowns?: number
  /** "m:ss" */
  controlTime?: string
  reversals?: number
  /** Significant strikes by target */
  head?: Attempted
  body?: Attempted
  leg?: Attempted
  /** Significant strikes by position */
  distance?: Attempted
  clinch?: Attempted
  ground?: Attempted
}

export interface RoundStats {
  round: number
  /** [fighterA, fighterB] in the order of competitorIds */
  fighters: [FighterFightStats, FighterFightStats]
}

export interface JudgeScorecard {
  judge: string
  scores: [number, number]
}

export interface UFCKeyMoment {
  round: number
  /** "m:ss" elapsed in round; omitted when the source only gives per-round counts. */
  time?: string
  type: 'knockdown' | 'takedown' | 'submission-attempt' | 'finish' | 'note'
  fighterId: string
  text: string
  major?: boolean
}

export interface UFCStats {
  event: string
  weightClass: string
  titleFight: boolean
  /** Null when the source doesn't state a round format. */
  scheduledRounds: number | null
  method: FinishMethod
  /** e.g. "Arm-triangle choke", "Punches" */
  methodDetail?: string
  endRound: number
  endTime: string
  referee?: string
  /** Totals for the whole fight, [fighterA, fighterB] */
  totals: [FighterFightStats, FighterFightStats]
  rounds?: RoundStats[]
  scorecards?: JudgeScorecard[]
  bonuses?: string[]
  records?: { before?: [string, string]; after?: [string, string] }
  keyMoments?: UFCKeyMoment[]
}
