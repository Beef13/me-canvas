import { useCallback, useEffect, useRef } from 'react'
import { Tldraw, type Editor } from 'tldraw'
import { useBoardUi } from '../core/store'
import {
  filesFromDataTransfer,
  ingestFiles,
  isExternalFileDrop,
} from '../features/dump/ingest'
import { setEditor } from './editorRef'
import { attachPersistence, restoreSnapshot } from './persistence'
import SelectionBridge from './SelectionBridge'
import { isTauri } from '../desktop/tauri'
import { onNativeFileDrop } from '../desktop/nativeDrop'

/**
 * Infinite canvas. tldraw owns rendering, camera, and all native
 * paste/single-drop handling (battle-tested — we don't intercept it).
 * We add:
 * - dark mode + local-first snapshot persistence (IndexedDB, debounced)
 * - multi-file drop interception: folder dumps auto-tile in a grid
 *   instead of stacking on one point. Single files pass through to tldraw.
 * - desktop (Tauri): native Finder drops via file paths, since desktop
 *   webviews hide OS drops from DataTransfer.
 */
export default function BoardCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<Editor | null>(null)
  const detachRef = useRef<(() => void) | null>(null)

  const onMount = useCallback((editor: Editor) => {
    editorRef.current = editor
    setEditor(editor)
    editor.setColorMode('dark')
    void restoreSnapshot(editor).then(() => {
      detachRef.current = attachPersistence(editor)
    })
  }, [])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const { setHint } = useBoardUi.getState()

    const onDrop = (e: DragEvent) => {
      const editor = editorRef.current
      if (!editor || !isExternalFileDrop(e)) return // internal move: pass through
      const files = filesFromDataTransfer(e.dataTransfer)
      if (files.length < 2) return // single file: tldraw places it at the cursor
      e.preventDefault()
      e.stopPropagation()
      let origin: { x: number; y: number }
      try {
        origin = editor.screenToPage({ x: e.clientX, y: e.clientY })
      } catch {
        origin = editor.screenToPage(editor.getViewportScreenCenter())
      }
      setHint(`Adding ${files.length} files…`)
      void ingestFiles(editor, files, origin).then((n) =>
        setHint(
          n === files.length
            ? `${n} items added`
            : n > 0
              ? `${n} added, ${files.length - n} skipped (unsupported type)`
              : 'Nothing readable dropped',
        ),
      )
    }

    const onDragOver = (e: DragEvent) => {
      const editor = editorRef.current
      if (!editor || !isExternalFileDrop(e)) return
      // Only claim the event for multi-file drags; singles stay native.
      if ((e.dataTransfer?.files.length ?? 0) > 1) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    el.addEventListener('drop', onDrop, true)
    el.addEventListener('dragover', onDragOver, true)

    // Desktop webviews hide Finder drops from DataTransfer — use the
    // native path (file paths + fs reads) when running under Tauri.
    let nativeUnlisten: (() => void) | null = null
    let cancelled = false
    if (isTauri()) {
      void onNativeFileDrop((files, total) => {
        const editor = editorRef.current
        if (!editor) return
        const origin = editor.screenToPage(editor.getViewportScreenCenter())
        setHint(`Adding ${total} file${total === 1 ? '' : 's'}…`)
        void ingestFiles(editor, files, origin).then((n) =>
          setHint(
            n === total
              ? `${n} item${n === 1 ? '' : 's'} added`
              : n > 0
                ? `${n} added, ${total - n} skipped`
                : 'Nothing readable dropped',
          ),
        )
      }).then((unlisten) => {
        if (cancelled) unlisten()
        else nativeUnlisten = unlisten
      })
    }

    return () => {
      cancelled = true
      nativeUnlisten?.()
      el.removeEventListener('drop', onDrop, true)
      el.removeEventListener('dragover', onDragOver, true)
      detachRef.current?.()
      detachRef.current = null
      editorRef.current = null
      setEditor(null)
    }
  }, [])

  return (
    <div ref={wrapRef} className="mc-canvas">
      <Tldraw onMount={onMount}>
        <SelectionBridge />
      </Tldraw>
    </div>
  )
}
