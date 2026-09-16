import { useEffect, useState } from 'react'
import { getEditor } from '../canvas/editorRef'
import { useBoardUi } from '../core/store'

const STATUS_LABEL: Record<string, string> = {
  loading: 'Loading…',
  ready: 'Local',
  saving: 'Saving…',
  saved: 'Saved locally',
  error: 'Save failed',
}

/** Bottom-left status: persistence state + last action hint + camera readout. */
export default function StatusBar() {
  const { saveStatus, hint } = useBoardUi()
  const [cam, setCam] = useState('')

  useEffect(() => {
    const timer = setInterval(() => {
      const editor = getEditor()
      if (!editor) return
      try {
        const c = editor.getCamera()
        const label = `${Math.round(c.x)},${Math.round(c.y)}@${Number(c.z).toFixed(2)}`
        setCam((prev) => (prev === label ? prev : label))
      } catch {
        // Editor tearing down — keep last reading.
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <footer className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2">
      <span className="rounded-full bg-black/75 px-2.5 py-1 text-[11px] text-white/80">
        ● {STATUS_LABEL[saveStatus] ?? saveStatus}
      </span>
      <span className="max-w-[50vw] truncate rounded-full bg-black/75 px-2.5 py-1 text-[11px] text-white/60">
        {hint}
      </span>
      {cam && (
        <span className="rounded-full bg-black/75 px-2.5 py-1 font-mono text-[10px] text-white/30">
          {cam}
        </span>
      )}
    </footer>
  )
}
