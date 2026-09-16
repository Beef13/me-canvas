// BISECT BUILD (temporary): bare tldraw + native drops only. All our
// editor interactions (dark mode, persistence, sanitize, view recovery,
// camera guard, selection bridge) are stripped to isolate the blackout cause.
import { useCallback, useEffect, useRef } from 'react'
import { Tldraw, type Editor } from 'tldraw'
import { useBoardUi } from '../core/store'
import { ingestFiles } from '../features/dump/ingest'
import { setEditor } from './editorRef'
import { isTauri } from '../desktop/tauri'
import { onNativeFileDrop } from '../desktop/nativeDrop'
import CanvasErrorBoundary from '../ui/CanvasErrorBoundary'

export default function BoardCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<Editor | null>(null)

  const onMount = useCallback((editor: Editor) => {
    editorRef.current = editor
    setEditor(editor)
  }, [])

  useEffect(() => {
    const { setHint } = useBoardUi.getState()
    let nativeUnlisten: (() => void) | null = null
    let cancelled = false
    if (isTauri()) {
      void onNativeFileDrop((files, total) => {
        const editor = editorRef.current
        if (!editor) return
        const origin = editor.screenToPage(editor.getViewportScreenCenter())
        setHint(`Adding ${total} file${total === 1 ? '' : 's'}…`)
        void ingestFiles(editor, files, origin).then((n) =>
          setHint(`${n}/${total} placed (bisect build)`),
        )
      }).then((unlisten) => {
        if (cancelled) unlisten()
        else nativeUnlisten = unlisten
      })
    }
    return () => {
      cancelled = true
      nativeUnlisten?.()
      editorRef.current = null
      setEditor(null)
    }
  }, [])

  return (
    <div ref={wrapRef} className="mc-canvas">
      <CanvasErrorBoundary>
        <Tldraw onMount={onMount} />
      </CanvasErrorBoundary>
    </div>
  )
}
