import type { MatchAnalysis, MatchDetail } from '@/types'
import type { NameOf } from '../timeline/buildTimeline'
import type { AnalysisEngine } from './AnalysisEngine'
import { analyzeCricket } from './cricketAnalysis'
import { analyzeFootball } from './footballAnalysis'
import { analyzeUFC } from './ufcAnalysis'

/** Local, deterministic analysis. Interprets verified data only; adds no new facts. */
class RuleBasedAnalysisEngine implements AnalysisEngine {
  readonly name = 'MatchIntel heuristic engine v0.1 (runs locally, no external AI service)'

  async analyze(detail: MatchDetail, nameOf: NameOf): Promise<MatchAnalysis> {
    const points =
      detail.sport === 'cricket' ? analyzeCricket(detail, nameOf)
        : detail.sport === 'football' ? analyzeFootball(detail, nameOf)
          : analyzeUFC(detail, nameOf)
    return { engine: this.name, generatedAt: new Date().toISOString(), points }
  }
}

export const analysisEngine: AnalysisEngine = new RuleBasedAnalysisEngine()
