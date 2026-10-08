export type Pair<T = number> = [T, T] // [home, away]

export interface GoalEvent {
  minute: number
  addedTime?: number
  teamId: string
  scorer: string
  assist?: string
  kind: 'open-play' | 'penalty' | 'own-goal' | 'header' | 'free-kick'
}

export interface CardEvent {
  minute: number
  addedTime?: number
  teamId: string
  player: string
  card: 'yellow' | 'red' | 'second-yellow'
}

export interface SubstitutionEvent {
  minute: number
  teamId: string
  playerOn: string
  playerOff: string
}

export interface FootballTeamStats {
  possession?: Pair
  /** True when possession is estimated from event timings rather than supplied by the source. */
  possessionEstimated?: boolean
  shots?: Pair
  shotsOnTarget?: Pair
  corners?: Pair
  fouls?: Pair
  offsides?: Pair
  xg?: Pair
  passes?: Pair
  passAccuracy?: Pair
}

export interface PlayerRating {
  player: string
  teamId: string
  rating: number
}

export interface FootballStats {
  fullTime: Pair
  halfTime?: Pair
  goals: GoalEvent[]
  cards?: CardEvent[]
  substitutions?: SubstitutionEvent[]
  teamStats?: FootballTeamStats
  /** Only populated when a reliable source supplies ratings. */
  playerRatings?: PlayerRating[]
  playerOfTheMatch?: { name: string; teamId: string }
  attendance?: number
  referee?: string
  extraTime?: boolean
  /** Penalty shoot-out score [home, away], if one took place. */
  penaltyShootout?: Pair
  lineups?: { home: string[]; away: string[] }
  managers?: Pair<string | undefined>
}
