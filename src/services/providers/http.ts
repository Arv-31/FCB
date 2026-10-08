import { DataError } from '@/types'

/** URL of a file in public/data, respecting the deploy base path (e.g. /FCB/ on GitHub Pages). */
export const dataUrl = (path: string) => `${import.meta.env.BASE_URL}data/${path}`

/** fetch + JSON with every failure mapped to a typed DataError for the UI. */
export async function fetchJson<T>(url: string, what = 'data'): Promise<T> {
  let res: Response
  try {
    res = await fetch(url)
  } catch {
    throw new DataError('network', `Couldn’t reach the server to load ${what}.`)
  }
  if (res.status === 404) throw new DataError('not-found', `The ${what} couldn’t be found.`)
  if (res.status === 429) {
    const retry = Number(res.headers.get('retry-after')) || 60
    throw new DataError('rate-limited', `The data provider is limiting requests for ${what}.`, retry)
  }
  if (!res.ok) throw new DataError('unavailable', `The data provider returned an error (${res.status}) while loading ${what}.`)
  try {
    return (await res.json()) as T
  } catch {
    throw new DataError('unavailable', `The ${what} received from the provider was not valid.`)
  }
}
