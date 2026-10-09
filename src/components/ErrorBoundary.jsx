import { Component } from 'react'
import { ErrorState } from './ui/Feedback'

export class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('UI error:', error, info) }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <ErrorState message="This page hit an unexpected error. Reloading usually fixes it." onRetry={() => window.location.reload()} />
      </div>
    )
  }
}
