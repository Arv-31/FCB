export type DataErrorKind =
  | 'unknown-competitor' | 'not-found' | 'unavailable' | 'rate-limited' | 'network' | 'invalid-request'

/** Typed error thrown by every data provider so the UI can show a precise message. */
export class DataError extends Error {
  readonly kind: DataErrorKind
  readonly retryAfterSeconds?: number
  constructor(kind: DataErrorKind, message: string, retryAfterSeconds?: number) {
    super(message)
    this.name = 'DataError'
    this.kind = kind
    this.retryAfterSeconds = retryAfterSeconds
  }
}
