import { useEffect, useState } from 'react'
import { useBoardUi } from '../core/store'
import { kvGet, kvSet } from '../storage/db'

const DISMISSED_KEY = 'me-canvas:onboarded:v1'

const STEPS = [
  { icon: '📥', title: 'Dump anything', body: 'Paste images or text, drop files and folders. Multi-file drops auto-tile in a grid.' },
  { icon: '🗂', title: 'Organize', body: 'Select items to align, distribute, and stack. Frame groups into named sections.' },
  { icon: '🔍', title: 'Find it later', body: 'Press ⌘K to search content, filenames, and #tags. Tag anything via the panel.' },
]

/** First-run overlay: shows only on an empty, never-onboarded board. */
export default function Onboarding() {
  const { shapeCount } = useBoardUi()
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    void kvGet<boolean>(DISMISSED_KEY).then((v) => setDismissed(v ?? false))
  }, [])

  if (dismissed || shapeCount > 0) return null

  const close = () => {
    setDismissed(true)
    void kvSet(DISMISSED_KEY, true)
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50">
      <div className="w-[min(520px,90vw)] rounded-2xl border border-white/10 bg-[#23262c] p-6 shadow-2xl">
        <h2 className="text-lg font-semibold">Welcome to me-canvas</h2>
        <p className="mt-1 text-sm text-white/60">
          Your infinite reference board. Everything saves locally, no account needed.
        </p>
        <div className="mt-4 space-y-3">
          {STEPS.map((s) => (
            <div key={s.title} className="flex gap-3">
              <span className="text-xl">{s.icon}</span>
              <div>
                <div className="text-sm font-medium">{s.title}</div>
                <div className="text-sm text-white/60">{s.body}</div>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={close}
          className="mt-5 w-full rounded-lg bg-white/90 py-2 text-sm font-medium text-black hover:bg-white"
        >
          Start dumping — paste anything
        </button>
      </div>
    </div>
  )
}
