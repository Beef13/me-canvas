import { useEffect, useState } from 'react'
import { getEditor } from '../canvas/editorRef'

interface Diag {
  errors: string[]
  box: string
  camera: string
  shapes: string
}

/** TEMPORARY diagnosis overlay: surfaces runtime errors + canvas geometry. */
export default function DiagOverlay() {
  const [diag, setDiag] = useState<Diag>({ errors: [], box: '?', camera: '?', shapes: '?' })

  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      setDiag((d) =>
        d.errors.length > 5 ? d : { ...d, errors: [...d.errors, `ERR: ${e.message}`] },
      )
    }
    const onRejection = (e: PromiseRejectionEvent) => {
      const msg = e.reason instanceof Error ? e.reason.message : String(e.reason)
      setDiag((d) =>
        d.errors.length > 5 ? d : { ...d, errors: [...d.errors, `REJ: ${msg}`] },
      )
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)

    const timer = setInterval(() => {
      const el = document.querySelector('.mc-canvas')
      const box = el ? `${el.clientWidth}x${el.clientHeight}` : 'missing'
      const editor = getEditor()
      let camera = 'no-editor'
      let shapes = '?'
      if (editor) {
        try {
          const c = editor.getCamera()
          camera = `${Math.round(c.x)},${Math.round(c.y)} z${Number(c.z).toFixed(2)}`
          shapes = String(editor.getCurrentPageShapeIds().size)
        } catch (err) {
          camera = `cam-err: ${err instanceof Error ? err.message : String(err)}`
        }
      }
      setDiag((d) => ({ ...d, box, camera, shapes }))
    }, 1000)

    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
      clearInterval(timer)
    }
  }, [])

  return (
    <div className="absolute left-1/2 top-2 z-50 -translate-x-1/2 rounded-lg bg-yellow-300 px-3 py-1.5 font-mono text-[11px] text-black">
      <div>
        box={diag.box} cam={diag.camera} shapes={diag.shapes}
      </div>
      {diag.errors.map((e, i) => (
        <div key={i} className="max-w-[70vw] truncate">
          {e}
        </div>
      ))}
    </div>
  )
}
