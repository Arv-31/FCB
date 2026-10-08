# Free data sources & how to plug them in

All match data currently comes from `src/data/mock` (fictional, labelled **Demo Data**).
To go live, write a provider that implements `SportProvider`
(`src/services/providers/SportProvider.ts`) and return it from the sport's factory
(`cricketService.ts`, `footballService.ts`, `ufcService.ts`). The UI does not change.

A provider must:
1. Return normalized domain types from `src/types` (never raw API JSON).
2. Throw `DataError` (`network`, `rate-limited`, `unavailable`, `not-found`, …) so the UI shows the right message.
3. Leave a field `undefined` when the source lacks it. The UI then shows
   "This statistic isn't available from the current data source." **Never fill gaps with guesses.**
4. Set `source: { provider, isDemo: false, url }` on every match.
5. Pass the same consistency checks as `scripts/validateData.ts`.

## Recommended free sources (checked Oct 2026; confirm limits on each site)

| Sport | Source | Cost / limits | Notes |
|---|---|---|---|
| Football | [football-data.org](https://www.football-data.org) | Free API key; ~10 req/min; ~12 top competitions | Has a head-to-head endpoint (`/v4/matches/{id}/head2head`). Send the key in the `X-Auth-Token` header. For a public site, call it from a tiny backend/proxy so the key isn't exposed. |
| Football | [StatsBomb Open Data](https://github.com/statsbomb/open-data) | Free (attribution required) | Event-level JSON (goals, shots, xG, lineups) for selected competitions, including many La Liga Barcelona matches. Static files: fetch or import at build time. |
| Football | [API-Football](https://www.api-football.com) | Free plan ~100 req/day | Statistics, events and H2H. Small daily quota, so cache aggressively. |
| Cricket | [Cricsheet](https://cricsheet.org) | Free open data | Ball-by-ball JSON for internationals. Zip downloads (no live API), so best converted to JSON at build time. |
| Cricket | [CricketData.org](https://cricketdata.org) | Free tier ~100 req/day | Fixtures, scorecards. |
| UFC | UFCStats.com via a self-hosted scraper (e.g. the open-source `ufc-scraper` / `ufc-api` Python packages) | Free | No free official UFC API exists. Scrape occasionally, cache to JSON, respect the site's terms, and serve that JSON to a provider. |
| Images | [TheSportsDB](https://www.thesportsdb.com) | Free key `123`, non-commercial, ~30 req/min | **Already enabled** (`src/services/images/imageService.ts`). Only accepts exact sport + name matches. The free search returns just one result, so e.g. "India" resolves to the *football* team and is rejected for cricket, which falls back to a monogram. |

Set `VITE_IMAGE_PROVIDER=none` in `.env` to disable external images entirely.

## Caching & rate limits
`SportsDataService` caches every call (TTL + in-flight de-duplication) in `src/services/cache.ts`.
With 10 req/min or 100 req/day limits, persist the cache to `localStorage` or a backend before going live.
