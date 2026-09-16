import { useEffect, useState } from 'react'
import { getEditor } from '../canvas/editorRef'
import { cursorBus, getSession } from '../collab/session'
import { useBoardUi } from '../core/store'

interface CursorView {
  peerId: string
  name: string
  color: string
  x: number
  y: number
}

const EXPIRE_MS = 3000

/** Live remote cursors, projected into screen space. */
export default function RemoteCursors() {
  const { peers } = useBoardUi()
  const [, setTick] = useState(0)

  // Broadcast our pointer as page coords (throttled in the session).
  useEffect(() => {
    const el = document.querySelector('.mc-canvas') as HTMLElement | null
    if (!el) return
    const onMove = (e: PointerEvent) => {
      const session = getSession()
      const editor = getEditor()
      if (!session || !editor) return
      try {
        const pt = editor.screenToPage({ x: e.clientX, y: e.clientY })
        session.sendCursor(pt.x, pt.y)
      } catch {
        // Canvas tearing down.
      }
    }
    el.addEventListener('pointermove', onMove)
    return () => el.removeEventListener('pointermove', onMove)
  }, [peers.length > 0])

  // Re-project on a beat so cursors track camera moves; expire the silent.
  useEffect(() => {
    if (peers.length === 0) return
    const timer = setInterval(() => setTick((t) => t + 1), 250)
    return () => clearInterval(timer)
  }, [peers.length])

  const editor = getEditor()
  if (!editor || peers.length <= 1) return null

  const views: CursorView[] = []
  const now = Date.now()
  for (const [, c] of cursorBus) {
    if (now - c.at > EXPIRE_MS) {
      cursorBus.delete(c.peerId)
      continue
    }
    try {
      const s = editor.pageToScreen({ x: c.x, y: c.y })
      views.push({ peerId: c.peerId, name: c.name, color: c.color, x: s.x, y: s.y })
    } catch {
      // Unprojectable — skip this beat.
    }
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {views.map((v) => (
        <div
          key={v.peerId}
          className="absolute flex items-center gap-1"
          style={{ left: v.x + 8, top: v.y + 8 }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" style={{ color: v.color }}>
            <path d="M4 2l8 6-4.5.5L5.5 13z" fill="currentColor" stroke="#000" strokeWidth="1" />
          </svg>
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px] text-white"
            style={{ backgroundColor: v.color }}
          >
            {v.name}
          </span>
        </div>
      ))}
    </div>
  )
}
