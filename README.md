# MatchIntel — Sports Match Intelligence (prototype)

Search two teams or fighters, see their head-to-head history, and open any match for a full
summary, sport-specific statistics, a timeline of key events and an AI-style analysis.
Supports **Cricket, Football and UFC**.

> ⚠️ All matches are **fictional demo data** (clearly labelled in the UI). Team and fighter
> names are real so search works, but players, events, scores and statistics are invented.
> See [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) for free real-data sources.

## Run it

```bash
npm install
npm run dev          # http://localhost:5199
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port **5199** (a dedicated port, so it won't clash with other projects) |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Serve the production build on port 5198 |
| `npm run validate:data` | Consistency checks on match data (runs + extras = total, goals = score, rounds = totals…) |
| `npm run test:logic` | Search aliases + narrative/timeline/analysis generation for every match (`-- --print` to read the output) |

Try: **India vs Australia**, **IND vs AUS**, **Madrid vs Barca** (typed in one box),
**Makhachev vs Oliveira**, or deep links like `/matchup/cricket/IND/AUS`.
Append `?simulate=network`, `?simulate=rate-limit` or `?simulate=unavailable` to any URL to see the error states.

## Architecture

```
UI (pages/components)  ──►  sportsService (SportsDataService: routing + caching + H2H aggregation)
                                 ├── cricketService  ┐
                                 ├── footballService ├─ each returns a SportProvider (currently MockProvider)
                                 └── ufcService      ┘
Derived, data-only builders:  timeline/ · narrative/ · analysis/ (AnalysisEngine interface)
Images:                        images/imageService (TheSportsDB, exact sport+name match, monogram fallback)
```

```
src/
  components/  ui/ (primitives) · search/ · match/ · sports/{cricket,football,ufc}/
  pages/       Home · Matches · Matchup · Match · About · NotFound
  layouts/     RootLayout (nav, demo banner, error boundary, suspense)
  services/    sportsService · providers/ · search/ · timeline/ · narrative/ · analysis/ · images/ · cache
  data/mock/   competitors · cricketMatches · footballMatches · ufcMatches
  types/       domain model (discriminated union per sport)
  hooks/ utils/ config/
scripts/       validateData.ts · smokeTest.ts
```

**Accuracy rules built into the code**
- Missing fields stay `undefined` and render as *"This statistic isn't available from the current data source."*
- Timeline and "What happened?" are generated only from structured data fields, so nothing is invented.
- AI Match Analysis is labelled as interpretation, and every point lists the verified figures behind it.
  The MVP engine is local and rule-based (free). An LLM can implement `AnalysisEngine` later.

**Adding a sport:** add the id to `SportId`, a stats type + `MatchDetail` variant, a provider factory,
an entry in `config/sports.ts`, and a stats panel in `components/sports/SportStats.tsx`.

**Performance:** route-level code splitting, lazy images, cached + de-duplicated requests,
debounced autocomplete, skeleton loaders, and match details fetched only when a match is opened.
