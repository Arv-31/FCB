import type { MatchDetail } from '@/types'
import type { NameOf } from '../timeline/buildTimeline'
import { cricketNarrative } from './cricketNarrative'
import { footballNarrative } from './footballNarrative'
import { ufcNarrative } from './ufcNarrative'

/** Plain-language "What happened?" built only from fields present in the data. */
export function buildNarrative(detail: MatchDetail, nameOf: NameOf): string[] {
  switch (detail.sport) {
    case 'cricket': return cricketNarrative(detail, nameOf)
    case 'football': return footballNarrative(detail, nameOf)
    case 'ufc': return ufcNarrative(detail, nameOf)
  }
}
