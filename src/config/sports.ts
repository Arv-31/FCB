import type { SportId } from '@/types'

export interface SportConfig {
  id: SportId
  label: string
  /** "Team" or "Fighter" — used in form labels. */
  competitorNoun: string
  /** Accent color, exposed to CSS as --accent on sport-themed sections. */
  accent: string
  accentSoft: string
  examples: [string, string][]
}

/** UI registry. Adding a sport = new SportId + provider + an entry here + a stats component. */
export const SPORTS: Record<SportId, SportConfig> = {
  cricket: {
    id: 'cricket',
    label: 'Cricket',
    competitorNoun: 'Team',
    accent: '#34d399',
    accentSoft: 'rgba(52, 211, 153, 0.12)',
    examples: [['India', 'Australia'], ['IND', 'AUS'], ['England', 'Australia']],
  },
  football: {
    id: 'football',
    label: 'Football',
    competitorNoun: 'Team',
    accent: '#38bdf8',
    accentSoft: 'rgba(56, 189, 248, 0.12)',
    examples: [['Real Madrid', 'Barcelona'], ['Madrid', 'Barca'], ['Man Utd', 'Liverpool']],
  },
  ufc: {
    id: 'ufc',
    label: 'UFC',
    competitorNoun: 'Fighter',
    accent: '#f43f5e',
    accentSoft: 'rgba(244, 63, 94, 0.12)',
    examples: [['Islam Makhachev', 'Charles Oliveira'], ['Makhachev', 'Oliveira']],
  },
}

export const SPORT_LIST = Object.values(SPORTS)

export function isSportId(v: string | undefined): v is SportId {
  return !!v && v in SPORTS
}
