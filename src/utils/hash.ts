/**
 * Static data is sharded into bucket files so the site stays a few thousand files
 * instead of tens of thousands. The build scripts and the app must agree on this.
 */
export const H2H_BUCKETS = 128
/** More detail buckets keep each match download small (~150 KB raw, far less gzipped). */
export const DETAIL_BUCKETS = 512

/** FNV-1a 32-bit hash → bucket number. */
export function bucketOf(key: string, buckets: number): number {
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0) % buckets
}

/** Order-independent key for a pair of competitors. */
export const pairKey = (a: string, b: string) => [a, b].sort().join('__')
