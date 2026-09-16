import { useEffect, useRef, useState } from 'react'
import { getEditor } from '../canvas/editorRef'
import { useBoardUi } from '../core/store'
import { SNAPSHOT_KEY } from '../core/types'
import { isPinned, isTauri, setPinned } from '../desktop/tauri'
import { ingestFiles, ingestText } from '../features/dump/ingest'
import { exportBoardAs } from '../features/export/exportBoard'
import { kvSet } from '../storage/db'

function download(name: string, text: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 5_000)
}

/** Top bar: board actions. Canvas state lives in tldraw; this is a thin shell. */
export default function Toolbar() {
  const fileRef = useRef<HTMLInputElement>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const { shapeCount, setHint, setSearchOpen } = useBoardUi()
  const [isDesktop] = useState(isTauri)
  const [pinned, setPinnedState] = useState(false)

  useEffect(() => {
    if (isDesktop) void isPinned().then(setPinnedState)
  }, [isDesktop])

  const togglePin = () => {
    void setPinned(!pinned).then((next) => {
      setPinnedState(next)
      setHint(next ? 'Pinned on top' : 'Unpinned')
    })
  }

  const withEditor = (fn: (e: NonNullable<ReturnType<typeof getEditor>>) => void) => {
    const editor = getEditor()
    if (!editor) {
      setHint('Canvas still loading…')
      return
    }
    fn(editor)
  }

  const addNote = () =>
    withEditor((editor) => {
      void ingestText(editor, 'Double-click to edit this note').then(() =>
        setHint('Note added'),
      )
    })

  const clearBoard = () =>
    withEditor((editor) => {
      if (!window.confirm('Delete everything on this board?')) return
      editor.selectAll()
      editor.deleteShapes(editor.getSelectedShapeIds())
      setHint('Board cleared')
    })

  const exportBoard = () =>
    withEditor((editor) => {
      const snap = editor.getSnapshot()
      void kvSet(SNAPSHOT_KEY, snap).finally(() => {
        download(`me-canvas-${Date.now()}.mcanvas.json`, JSON.stringify(snap))
        setHint('Board backup downloaded')
      })
    })

  const exportImage = (format: 'png' | 'svg') =>
    withEditor((editor) => {
      void exportBoardAs(editor, format).then(setHint).catch(() => setHint('Image export failed'))
    })

  return (
    <header className="flex items-center gap-2 border-b border-white/10 bg-[#23262c] px-3 py-2">
      <span className="text-sm font-semibold tracking-wide">me-canvas</span>
      <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">
        {shapeCount} item{shapeCount === 1 ? '' : 's'}
      </span>
      <div className="flex-1" />
      <button
        className="rounded-md bg-white/10 px-2.5 py-1.5 text-xs hover:bg-white/20"
        title="Search board (Ctrl/⌘+K)"
        onClick={() => setSearchOpen(true)}
      >
        ⌘K Search
      </button>
      <button
        className="rounded-md bg-white/10 px-2.5 py-1.5 text-xs hover:bg-white/20"
        onClick={addNote}
      >
        + Note
      </button>
      <button
        className="rounded-md bg-white/10 px-2.5 py-1.5 text-xs hover:bg-white/20"
        onClick={() => fileRef.current?.click()}
      >
        Upload
      </button>
      <button
        className="rounded-md bg-white/10 px-2.5 py-1.5 text-xs hover:bg-white/20"
        title="Export selection (or whole board) as PNG"
        onClick={() => exportImage('png')}
      >
        PNG
      </button>
      <button
        className="rounded-md bg-white/10 px-2.5 py-1.5 text-xs hover:bg-white/20"
        title="Export selection (or whole board) as SVG"
        onClick={() => exportImage('svg')}
      >
        SVG
      </button>
      <button
        className="rounded-md bg-white/10 px-2.5 py-1.5 text-xs hover:bg-white/20"
        title="Download full board backup (.mcanvas.json)"
        onClick={exportBoard}
      >
        Backup
      </button>
      <button
        className="rounded-md bg-white/10 px-2.5 py-1.5 text-xs hover:bg-white/20"
        onClick={() => importRef.current?.click()}
      >
        Import
      </button>
      <button
        className="rounded-md bg-red-500/20 px-2.5 py-1.5 text-xs text-red-200 hover:bg-red-500/30"
        onClick={clearBoard}
      >
        Clear
      </button>
      {isDesktop && (
        <button
          className={`rounded-md px-2.5 py-1.5 text-xs ${
            pinned ? 'bg-amber-400/30 text-amber-100' : 'bg-white/10 hover:bg-white/20'
          }`}
          title="Keep window always on top (desktop)"
          onClick={togglePin}
        >
          📌 {pinned ? 'Pinned' : 'Pin'}
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*,video/*,.pdf"
        className="hidden"
        onChange={(e) => {
          const files = e.target.files ? Array.from(e.target.files) : []
          e.target.value = ''
          if (files.length === 0) return
          withEditor((editor) => {
            setHint(`Adding ${files.length} file${files.length > 1 ? 's' : ''}…`)
            void ingestFiles(editor, files).then((n) =>
              setHint(
                n === files.length
                  ? `${n} item${n === 1 ? '' : 's'} added`
                  : `${n} added, ${files.length - n} skipped (unsupported type)`,
              ),
            )
          })
        }}
      />
      <input
        ref={importRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          withEditor((editor) => {
            void file.text().then((text) => {
              try {
                editor.loadSnapshot(JSON.parse(text))
                setHint('Board imported')
              } catch {
                setHint('Import failed: not a board file')
              }
            })
          })
        }}
      />
    </header>
  )
}
