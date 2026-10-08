import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Changing this key resets the boundary (e.g. on navigation). */
  resetKey?: string
  fallback?: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI error boundary caught:', error, info.componentStack)
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div role="alert" className="mx-auto max-w-xl rounded-2xl border border-loss/25 bg-loss/5 p-6 text-center">
            <p className="font-semibold">This section failed to display.</p>
            <p className="mt-1 text-sm text-muted">The rest of the page still works. Try reloading if the problem persists.</p>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-4 rounded-lg border border-line-strong px-4 py-2 text-sm hover:bg-surface-3"
            >
              Try again
            </button>
          </div>
        )
      )
    }
    return this.props.children
  }
}
