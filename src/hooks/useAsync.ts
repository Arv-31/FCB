import { useCallback, useEffect, useState } from 'react'

export type AsyncState<T> =
  | { status: 'loading'; data?: undefined; error?: undefined }
  | { status: 'success'; data: T; error?: undefined }
  | { status: 'error'; data?: undefined; error: unknown }

/**
 * Runs an async loader whenever `deps` change and ignores stale responses,
 * so fast navigation never shows data for the previous route.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]): AsyncState<T> & { retry: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setState({ status: 'loading' })
    loader().then(
      (data) => active && setState({ status: 'success', data }),
      (error) => active && setState({ status: 'error', error }),
    )
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return { ...state, retry }
}
