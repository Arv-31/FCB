/**
 * Logic smoke test: search resolution + narrative/timeline/analysis generation for every match.
 * Run with `npm run test:logic`. Pass --print to dump generated text for review.
 */
import { cricketDetails, footballDetails, mockCompetitors, ufcDetails } from '../src/data/mock/index.ts'
import { analyzeCricket } from '../src/services/analysis/cricketAnalysis.ts'
import { analyzeFootball } from '../src/services/analysis/footballAnalysis.ts'
import { analyzeUFC } from '../src/services/analysis/ufcAnalysis.ts'
import { buildNarrative } from '../src/services/narrative/index.ts'
import { resolveCompetitor, splitMatchup } from '../src/services/search/resolver.ts'
import { buildTimeline } from '../src/services/timeline/buildTimeline.ts'
import type { MatchDetail, SportId } from '../src/types/index.ts'

const print = process.argv.includes('--print')
let failures = 0
const check = (ok: boolean, msg: string) => {
  if (!ok) {
    failures++
    console.error('  ✗ ' + msg)
  }
}

// Search: every example from the product spec must resolve.
const cases: [SportId, string, string][] = [
  ['cricket', 'India', 'ind'], ['cricket', 'IND', 'ind'], ['cricket', 'australia', 'aus'], ['cricket', 'AUS', 'aus'],
  ['cricket', 'Bharat', 'ind'], ['cricket', 'austr', 'aus'],
  ['football', 'Real Madrid', 'rma'], ['football', 'Madrid', 'rma'], ['football', 'Barca', 'fcb'], ['football', 'Barça', 'fcb'],
  ['football', 'barcelona', 'fcb'], ['football', 'man utd', 'mun'], ['football', 'Barcelone', 'fcb'],
  ['ufc', 'Islam Makhachev', 'makhachev'], ['ufc', 'Makhachev', 'makhachev'], ['ufc', 'makachev', 'makhachev'],
  ['ufc', 'Charles Oliveira', 'oliveira'], ['ufc', 'Oliveira', 'oliveira'], ['ufc', 'do bronx', 'oliveira'],
]
console.log('Search resolution')
for (const [sport, q, expected] of cases) {
  const r = resolveCompetitor(mockCompetitors.filter((c) => c.sport === sport), q)
  check(r.status === 'resolved' && r.competitor.id === expected, `${sport}: "${q}" → expected ${expected}, got ${JSON.stringify(r.status === 'resolved' ? r.competitor.id : r.status)}`)
}
check(resolveCompetitor(mockCompetitors.filter((c) => c.sport === 'cricket'), 'Narnia').status === 'unknown', 'unknown team should not resolve')
check(JSON.stringify(splitMatchup('Madrid vs Barca')) === '["Madrid","Barca"]', 'split "vs"')
check(JSON.stringify(splitMatchup('IND v AUS')) === '["IND","AUS"]', 'split "v"')
check(splitMatchup('Real Madrid') === null, 'no split without vs')

const names = new Map(mockCompetitors.map((c) => [c.id, c.name]))
const nameOf = (id: string) => names.get(id) ?? id

console.log('Narrative / timeline / analysis')
const all: MatchDetail[] = [...cricketDetails, ...footballDetails, ...ufcDetails]
for (const d of all) {
  const narrative = buildNarrative(d, nameOf)
  const timeline = buildTimeline(d, nameOf)
  const analysis = d.sport === 'cricket' ? analyzeCricket(d, nameOf) : d.sport === 'football' ? analyzeFootball(d, nameOf) : analyzeUFC(d, nameOf)
  check(narrative.length > 0 && narrative.every((p) => p.trim().length > 0), `${d.id}: empty narrative`)
  check(!narrative.join(' ').match(/undefined|NaN|null/), `${d.id}: narrative contains undefined/NaN`)
  check(!JSON.stringify(timeline).match(/undefined|NaN/), `${d.id}: timeline contains undefined/NaN`)
  check(!JSON.stringify(analysis).match(/undefined|NaN|Infinity/), `${d.id}: analysis contains undefined/NaN`)
  for (let i = 1; i < timeline.length; i++) check(timeline[i].order >= timeline[i - 1].order, `${d.id}: timeline out of order`)
  if (print) {
    console.log(`\n=== ${d.id}`)
    narrative.forEach((p) => console.log('  ' + p))
    console.log('  -- timeline')
    timeline.forEach((e) => console.log(`   ${e.marker.padEnd(9)} ${e.major ? '*' : ' '} ${e.title}${e.description ? ' — ' + e.description : ''}`))
    console.log('  -- analysis')
    for (const [k, p] of Object.entries(analysis)) console.log(`   [${k}] ${p!.body}\n      ${(p!.evidence ?? []).join(' | ')}`)
  }
}

if (failures) {
  console.error(`\n✗ ${failures} check(s) failed`)
  process.exit(1)
}
console.log(`✓ All checks passed (${cases.length} search cases, ${all.length} matches)`)
