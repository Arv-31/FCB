import type { Competitor, ImageAsset } from '@/types'

/**
 * Optional image enrichment from TheSportsDB (free API key "123", non-commercial use).
 *
 * Safety rules, because a wrong logo is worse than no logo:
 *  - Results are accepted only if the result's sport matches (e.g. a search for "India"
 *    returns the *football* team, which we must reject on a cricket page).
 *  - The name must match exactly (case/accent-insensitive).
 *  - Anything else falls back to a generated monogram badge in the UI.
 */
const PROVIDER = (import.meta.env.VITE_IMAGE_PROVIDER ?? 'thesportsdb') as 'thesportsdb' | 'none'
const BASE = 'https://www.thesportsdb.com/api/v1/json/123'
const STORAGE_KEY = 'matchintel:images:v1'
const TTL_MS = 7 * 24 * 60 * 60 * 1000

const SPORT_NAMES: Record<Competitor['sport'], string> = {
  cricket: 'Cricket',
  football: 'Soccer',
  ufc: 'Fighting',
}

type Stored = Record<string, { asset: ImageAsset | null; at: number }>

function readStore(): Stored {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Stored
  } catch {
    return {}
  }
}

function writeStore(s: Stored) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    /* storage full or blocked: in-memory cache still works */
  }
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const memory = new Map<string, Promise<ImageAsset | null>>()

// TheSportsDB's free tier allows ~30 requests/minute: space requests out through a queue.
const MIN_GAP_MS = 2100
let nextSlot = 0
function throttle(): Promise<void> {
  const now = Date.now()
  const wait = Math.max(0, nextSlot - now)
  nextSlot = Math.max(now, nextSlot) + MIN_GAP_MS
  return new Promise((r) => setTimeout(r, wait))
}

async function fetchFromTheSportsDB(c: Competitor): Promise<ImageAsset | null> {
  await throttle()
  const isTeam = c.kind === 'team'
  const url = isTeam
    ? `${BASE}/searchteams.php?t=${encodeURIComponent(c.name)}`
    : `${BASE}/searchplayers.php?p=${encodeURIComponent(c.name)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`TheSportsDB ${res.status}`) // not cached: retried next session
  const json = await res.json()
  const list: Record<string, string | null>[] = (isTeam ? json.teams : json.player) ?? []
  const match = list.find(
    (x) => x.strSport === SPORT_NAMES[c.sport] && norm((isTeam ? x.strTeam : x.strPlayer) ?? '') === norm(c.name),
  )
  const img = match && (isTeam ? match.strBadge : match.strCutout || match.strThumb)
  if (!img) return null
  return {
    url: `${img}/small`, // TheSportsDB serves resized variants at /small and /tiny
    alt: `${c.name} ${isTeam ? 'badge' : 'photo'}`,
    attribution: 'TheSportsDB',
    sourceUrl: 'https://www.thesportsdb.com',
  }
}

export function getCompetitorImage(c: Competitor): Promise<ImageAsset | null> {
  // Free search returns only the first hit, which for national cricket teams is the football side,
  // so cricket lookups can never pass the sport check — skip them instead of wasting the rate limit.
  if (PROVIDER === 'none' || c.sport === 'cricket') return Promise.resolve(null)
  const key = `${c.sport}:${c.id}`
  const cached = memory.get(key)
  if (cached) return cached

  const stored = readStore()[key]
  if (stored && Date.now() - stored.at < TTL_MS) {
    const p = Promise.resolve(stored.asset)
    memory.set(key, p)
    return p
  }

  const p = fetchFromTheSportsDB(c)
    .then((asset) => {
      writeStore({ ...readStore(), [key]: { asset, at: Date.now() } })
      return asset
    })
    .catch(() => null) // network errors → monogram fallback, retried next session
  memory.set(key, p)
  return p
}
