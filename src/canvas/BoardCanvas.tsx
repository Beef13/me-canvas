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
import { recoverLostView, ensureContentVisible } from './recoverView'
import SelectionBridge from './SelectionBridge'
import { isTauri } from '../desktop/tauri'
import { onNativeFileDrop } from '../desktop/nativeDrop'
import type { PhysicalPosition } from '@tauri-apps/api/dpi'
import { getCurrentWindow } from '@tauri-apps/api/window'
import type { PagePoint } from '../core/types'

/**
 * Convert a native OS drop position (physical screen pixels) into a canvas
 * page point via window client area → CSS px → tldraw screen space.
 * Falls back to the viewport center when the result looks wrong — a wild
 * point triggers tldraw's zoom-to-content, which is exactly what we avoid.
 */
async function nativeDropPoint(editor: Editor, pos: PhysicalPosition): Promise<PagePoint> {
  const fallback = (): PagePoint => {
    const c = editor.getViewportScreenCenter()
    return editor.screenToPage(c)
  }
  try {
    const win = getCurrentWindow()
    const [scale, inner] = await Promise.all([win.scaleFactor(), win.innerPosition()])
    const p = pos.toLogical(scale)
    const o = inner.toLogical(scale)
    const pt = editor.screenToPage({ x: p.x - o.x, y: p.y - o.y })
    const vb = editor.getViewportPageBounds()
    const margin = Math.max(vb.width, vb.height)
    const sane =
      pt.x >= vb.x - margin &&
      pt.x <= vb.x + vb.width + margin &&
      pt.y >= vb.y - margin &&
      pt.y <= vb.y + vb.height + margin
    return sane ? { x: pt.x, y: pt.y } : fallback()
  } catch {
    return fallback()
  }
}

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
      if (recoverLostView(editor)) {
        useBoardUi.getState().setHint('View recovered — camera was lost')
      }
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
      void ingestFiles(editor, files, origin).then((n) => {
        if (ensureContentVisible(editor)) {
          setHint('Centered dropped items')
        } else {
          setHint(
            n === files.length
              ? `${n} items added`
              : n > 0
                ? `${n} added, ${files.length - n} skipped (unsupported type)`
                : 'Nothing readable dropped',
          )
        }
      })
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
      void onNativeFileDrop((files, total, position) => {
        const editor = editorRef.current
        if (!editor) return
        void nativeDropPoint(editor, position).then((origin) => {
          if (!editorRef.current) return
          setHint(`Adding ${total} file${total === 1 ? '' : 's'}…`)
          void ingestFiles(editor, files, origin).then((n) => {
            if (ensureContentVisible(editor)) {
              setHint('Centered dropped items')
            } else {
              setHint(
                n === total
                  ? `${n} item${n === 1 ? '' : 's'} added`
                  : n > 0
                    ? `${n} added, ${total - n} skipped`
                    : 'Nothing readable dropped',
              )
            }
          })
        })
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
