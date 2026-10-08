/**
 * Builds public/data/** from the raw downloads in .data-cache/raw.
 *   npm run data:build              # all sports
 *   npm run data:build -- cricket   # one sport
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildCricket } from './buildCricket.ts'
import { buildFootball } from './buildFootball.ts'
import { buildUfc } from './buildUfc.ts'
import { OUT } from './lib.ts'

const only = process.argv[2]
const jobs = { cricket: buildCricket, football: buildFootball, ufc: buildUfc }
const t0 = Date.now()
for (const [name, job] of Object.entries(jobs)) {
  if (only && only !== name) continue
  console.log(`Building ${name}…`)
  job()
}
writeFileSync(join(OUT, 'build-info.json'), JSON.stringify({ builtAt: new Date().toISOString() }))
console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
