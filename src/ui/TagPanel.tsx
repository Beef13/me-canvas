import { useState } from 'react'
import { getEditor } from '../canvas/editorRef'
import { useBoardUi } from '../core/store'
import {
  addTagToSelection,
  getTags,
  removeTagFromSelection,
} from '../features/find/tags'

/** Floating tag editor for the current selection (bottom-right). */
export default function TagPanel() {
  const { selectedIds, setHint } = useBoardUi()
  const [draft, setDraft] = useState('')

  if (selectedIds.length === 0) return null

  const editor = getEditor()
  const union = new Set<string>()
  if (editor) {
    try {
      for (const id of selectedIds) {
        const shape = editor.getShape(id as never) as
          | { meta?: Record<string, unknown> | null }
          | undefined
        if (shape) getTags(shape).forEach((t) => union.add(t))
      }
    } catch {
      // Selection changed mid-render; show empty until next sync.
    }
  }
  const tags = [...union].sort()

  const add = () => {
    const e = getEditor()
    if (!e || !draft.trim()) return
    try {
      const next = addTagToSelection(e, draft)
      setDraft('')
      setHint(next.length > 0 ? `Tagged #${next[next.length - 1]}` : 'Tag added')
    } catch {
      setHint('Tag update failed')
    }
  }

  const remove = (tag: string) => {
    const e = getEditor()
    if (!e) return
    try {
      removeTagFromSelection(e, tag)
      setHint(`Removed #${tag}`)
    } catch {
      setHint('Tag update failed')
    }
  }

  return (
    <div className="absolute bottom-3 right-3 w-56 rounded-xl border border-white/10 bg-[#23262c]/95 p-2.5 shadow-xl backdrop-blur">
      <div className="mb-1.5 text-[11px] uppercase tracking-wide text-white/40">
        Tags · {selectedIds.length} selected
      </div>
      <div className="mb-1.5 flex flex-wrap gap-1">
        {tags.map((t) => (
          <button
            key={t}
            onClick={() => remove(t)}
            title={`Remove #${t}`}
            className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80 hover:bg-red-500/30 hover:text-red-100"
          >
            #{t} ×
          </button>
        ))}
        {tags.length === 0 && <span className="text-xs text-white/30">No tags yet</span>}
      </div>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') add()
        }}
        placeholder="Add tag + Enter"
        className="w-full rounded-md bg-black/40 px-2 py-1.5 text-xs outline-none placeholder:text-white/25 focus:ring-1 focus:ring-white/20"
      />
    </div>
  )
}
