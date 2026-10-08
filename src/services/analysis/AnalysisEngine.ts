import type { MatchAnalysis, MatchDetail } from '@/types'
import type { NameOf } from '../timeline/buildTimeline'

/**
 * Pluggable analysis engine. The MVP ships a local rule-based engine (free, offline).
 * An LLM-backed engine can implement the same interface later — it should receive
 * only the verified MatchDetail and must cite figures from it as `evidence`.
 */
export interface AnalysisEngine {
  readonly name: string
  analyze(detail: MatchDetail, nameOf: NameOf): Promise<MatchAnalysis>
}
