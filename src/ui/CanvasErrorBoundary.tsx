import { Component, type ReactNode } from 'react'

/**
 * Catches render crashes inside the canvas tree. Without this, a single
 * malformed shape unmounts the whole canvas into a black hole while the
 * surrounding UI keeps working — exactly the confusing state to avoid.
 */
export default class CanvasErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('[me-canvas] canvas render crashed:', error)
  }

  render() {
    const { error } = this.state
    if (error) {
      return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 p-8">
          <div className="max-w-lg rounded-xl border border-red-400/30 bg-[#2a2226] p-5 text-left">
            <div className="font-semibold text-red-200">Canvas render crashed</div>
            <div className="mt-1 break-words font-mono text-xs text-red-200/80">
              {error.message}
            </div>
            <div className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[10px] text-white/40">
              {(error.stack ?? '').split('\n').slice(0, 6).join('\n')}
            </div>
            <div className="mt-2 text-xs text-white/50">
              Your data is intact (item count above). Screenshot this and reload.
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
