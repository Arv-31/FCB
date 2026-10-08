interface Entry<T> {
  value: T
  expires: number
}

/**
 * Tiny TTL cache with in-flight request de-duplication.
 * Two components asking for the same key at once share one request,
 * which matters once rate-limited free APIs sit behind the providers.
 */
export class TTLCache {
  private store = new Map<string, Entry<unknown>>()
  private inflight = new Map<string, Promise<unknown>>()
  private readonly maxEntries: number

  constructor(maxEntries = 200) {
    this.maxEntries = maxEntries
  }

  async getOrLoad<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
    const hit = this.store.get(key)
    if (hit && hit.expires > Date.now()) return hit.value as T

    const pending = this.inflight.get(key)
    if (pending) return pending as Promise<T>

    const promise = load()
      .then((value) => {
        this.set(key, value, ttlMs)
        return value
      })
      .finally(() => this.inflight.delete(key))
    this.inflight.set(key, promise)
    return promise
  }

  private set(key: string, value: unknown, ttlMs: number) {
    if (this.store.size >= this.maxEntries) {
      // Map preserves insertion order: drop the oldest entry.
      const oldest = this.store.keys().next().value
      if (oldest !== undefined) this.store.delete(oldest)
    }
    this.store.set(key, { value, expires: Date.now() + ttlMs })
  }

  clear() {
    this.store.clear()
  }
}
