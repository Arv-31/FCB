/**
 * StatsBomb Open Data match lists → MatchIntel football index.
 * Detailed statistics are NOT precomputed: the browser loads a match's StatsBomb
 * event file only when the user opens that match.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Competitor, MatchSummary } from '../../src/types/index.ts'
import { KNOWN_COLORS, RAW, colorsFor, writeDataset } from './lib.ts'

interface SbMatch {
  match_id: number
  match_date: string
  competition: { competition_id: number; competition_name: string; country_name: string }
  season: { season_id: number; season_name: string }
  home_team: { home_team_id: number; home_team_name: string; home_team_gender: string; country?: { name: string }; managers?: { name: string; nickname?: string | null }[] }
  away_team: { away_team_id: number; away_team_name: string; away_team_gender: string; country?: { name: string }; managers?: { name: string; nickname?: string | null }[] }
  home_score: number | null
  away_score: number | null
  match_status: string
  match_week?: number
  competition_stage?: { name: string }
  stadium?: { name: string; country?: { name: string } }
  referee?: { name: string }
}

const ALIASES: Record<string, string[]> = {
  'Real Madrid': ['madrid', 'real', 'rm', 'rmcf', 'los blancos', 'real madrid cf'],
  Barcelona: ['barca', 'barça', 'fcb', 'fc barcelona', 'blaugrana'],
  'Atlético Madrid': ['atletico', 'atleti', 'atletico madrid', 'atm'],
  'Manchester United': ['man utd', 'man united', 'mufc', 'man u', 'united'],
  'Manchester City': ['man city', 'mcfc', 'city'],
  Liverpool: ['lfc', 'the reds'],
  Arsenal: ['afc', 'gunners'],
  Chelsea: ['cfc', 'blues'],
  'Tottenham Hotspur': ['spurs', 'tottenham', 'thfc'],
  'Bayern Munich': ['bayern', 'fcb munich', 'fc bayern'],
  'Bayer Leverkusen': ['leverkusen', 'bayer 04'],
  'Borussia Dortmund': ['dortmund', 'bvb'],
  'Paris Saint-Germain': ['psg', 'paris'],
  Juventus: ['juve'],
  'AC Milan': ['milan'],
  'Inter Milan': ['inter', 'internazionale'],
  'United States': ['usa', 'usmnt'],
}

const SHORT: Record<string, string> = { 'Real Madrid': 'RMA', Barcelona: 'BAR', 'Manchester United': 'MUN', 'Manchester City': 'MCI', Liverpool: 'LIV', Arsenal: 'ARS', Chelsea: 'CHE', 'Atlético Madrid': 'ATM', 'Bayern Munich': 'BAY' }

const isWomen = (gender: string) => gender === 'female'

export function buildFootball() {
  const dir = join(RAW, 'statsbomb', 'matches')
  const competitors = new Map<string, Competitor>()
  const summaries: MatchSummary[] = []
  const details = new Map<string, unknown>()

  const team = (id: number, name: string, gender: string, country?: string) => {
    const cid = `fb-${id}`
    if (!competitors.has(cid)) {
      const women = isWomen(gender) && !/women/i.test(name)
      const display = women ? `${name} Women` : name
      const base = ALIASES[name] ?? []
      const initials = name.split(/\s+/).length > 1 ? [name.split(/\s+/).map((w) => w[0]).join('').toLowerCase()] : []
      competitors.set(cid, {
        id: cid, sport: 'football', kind: 'team', name: display,
        shortName: SHORT[name] ?? name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase(),
        aliases: (women ? [...base.map((a) => `${a} women`), `${name} women`] : [...base, ...initials]).filter((a) => a.length > 1),
        subtitle: [women ? 'Women' : undefined, country].filter(Boolean).join(' · ') || undefined,
        country,
        colors: KNOWN_COLORS[name] ?? colorsFor(name),
      })
    }
    return cid
  }

  for (const comp of readdirSync(dir)) {
    for (const file of readdirSync(join(dir, comp))) {
      const list = JSON.parse(readFileSync(join(dir, comp, file), 'utf8')) as SbMatch[]
      for (const m of list) {
        if (m.home_score == null || m.away_score == null) continue
        const h = team(m.home_team.home_team_id, m.home_team.home_team_name, m.home_team.home_team_gender, m.home_team.country?.name)
        const a = team(m.away_team.away_team_id, m.away_team.away_team_name, m.away_team.away_team_gender, m.away_team.country?.name)
        const hs = m.home_score
        const as = m.away_score
        const stage = m.competition_stage?.name
        const knockout = stage && !/regular season|group/i.test(stage)
        const H = competitors.get(h)!.name
        const A = competitors.get(a)!.name
        const result: MatchSummary['result'] =
          hs === as
            ? { outcome: 'draw', winnerId: null, text: knockout ? `Level at ${hs}–${as} — decided after extra time or penalties (see match)` : `Draw ${hs}–${as}` }
            : { outcome: 'win', winnerId: hs > as ? h : a, text: `${hs > as ? H : A} won ${Math.max(hs, as)}–${Math.min(hs, as)}` }
        const women = isWomen(m.home_team.home_team_gender)
        const summary: MatchSummary = {
          id: `fb-${m.match_id}`,
          sport: 'football',
          date: m.match_date,
          competition: `${women && !/women/i.test(m.competition.competition_name) ? "Women's " : ''}${m.competition.competition_name} ${m.season.season_name}`,
          stage: [stage, m.match_week && /regular season/i.test(stage ?? '') ? `Matchday ${m.match_week}` : undefined].filter(Boolean).join(' · ') || undefined,
          venue: { name: m.stadium?.name, country: m.stadium?.country?.name },
          competitorIds: [h, a],
          score: [String(hs), String(as)],
          result,
          source: { provider: 'StatsBomb Open Data', isDemo: false, url: 'https://github.com/statsbomb/open-data' },
          hasDetail: true,
          ref: { statsbomb: m.match_id },
        }
        summaries.push(summary)
        const mgr = (x?: { name: string; nickname?: string | null }[]) => x?.[0] ? x[0].nickname || x[0].name : undefined
        details.set(summary.id, { ...summary, referee: m.referee?.name, managers: [mgr(m.home_team.managers), mgr(m.away_team.managers)] })
      }
    }
  }
  writeDataset('football', [...competitors.values()], summaries, details)
}
