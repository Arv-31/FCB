import type { Competitor, MatchDetail } from '@/types'
import { CricketStats } from './cricket/CricketStats'
import { FootballStats } from './football/FootballStats'
import { UFCStats } from './ufc/UFCStats'

/** Picks the statistics panel for the match's sport. New sports register here. */
export function SportStats({ detail, get }: { detail: MatchDetail; get: (id: string) => Competitor | undefined }) {
  switch (detail.sport) {
    case 'cricket': return <CricketStats detail={detail} get={get} />
    case 'football': return <FootballStats detail={detail} get={get} />
    case 'ufc': return <UFCStats detail={detail} get={get} />
  }
}
