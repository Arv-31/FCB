/**
 * Downloads the free raw datasets into .data-cache/raw/<source>/ (git-ignored).
 * Raw files are treated as untrusted data: they are only parsed as JSON/CSV, never executed.
 *
 *   npm run data:download            # all sources
 *   npm run data:download -- ufc     # one source (cricsheet | ufc | statsbomb)
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..', '.data-cache', 'raw')

async function fetchTo(url: string, file: string) {
  const res = await fetch(url, { headers: { 'User-Agent': 'match-intel-data-build' } })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(file, buf)
  return buf.length
}

function freshDir(dir: string) {
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
}

async function cricsheet() {
  const dir = join(ROOT, 'cricsheet')
  freshDir(dir)
  for (const fmt of ['odis', 't20s', 'tests']) {
    const zip = join(dir, `${fmt}_json.zip`)
    const size = await fetchTo(`https://cricsheet.org/downloads/${fmt}_json.zip`, zip)
    console.log(`  cricsheet ${fmt}: ${(size / 1e6).toFixed(1)} MB`)
    const out = join(dir, fmt)
    mkdirSync(out)
    // -q quiet, -o overwrite; only .json and README files are present in these archives
    execFileSync('unzip', ['-q', '-o', zip, '-d', out])
    rmSync(zip)
  }
}

async function ufc() {
  const dir = join(ROOT, 'ufc')
  freshDir(dir)
  const base = 'https://raw.githubusercontent.com/Greco1899/scrape_ufc_stats/main'
  for (const f of ['ufc_event_details.csv', 'ufc_fight_details.csv', 'ufc_fight_results.csv', 'ufc_fight_stats.csv', 'ufc_fighter_details.csv', 'ufc_fighter_tott.csv']) {
    const size = await fetchTo(`${base}/${f}`, join(dir, f))
    console.log(`  ufc ${f}: ${(size / 1e6).toFixed(2)} MB`)
  }
}

async function statsbomb() {
  const dir = join(ROOT, 'statsbomb')
  freshDir(dir)
  const base = 'https://raw.githubusercontent.com/statsbomb/open-data/master/data'
  await fetchTo(`${base}/competitions.json`, join(dir, 'competitions.json'))
  const tree = await (await fetch('https://api.github.com/repositories/136174015/git/trees/master:data/matches?recursive=1', {
    headers: { 'User-Agent': 'match-intel-data-build' },
  })).json() as { tree: { path: string; type: string }[] }
  const files = tree.tree.filter((x) => x.type === 'blob' && /^\d+\/\d+\.json$/.test(x.path))
  let total = 0
  for (const f of files) {
    const [comp, season] = f.path.split('/')
    mkdirSync(join(dir, 'matches', comp), { recursive: true })
    total += await fetchTo(`${base}/matches/${comp}/${season}`, join(dir, 'matches', comp, season))
  }
  console.log(`  statsbomb: ${files.length} match lists, ${(total / 1e6).toFixed(1)} MB`)
}

const only = process.argv[2]
const jobs: Record<string, () => Promise<void>> = { cricsheet, ufc, statsbomb }
for (const [name, job] of Object.entries(jobs)) {
  if (only && only !== name) continue
  console.log(`Downloading ${name}…`)
  await job()
}
console.log('Done.')
