import { useEffect, useMemo, useRef, useState } from 'react'
import { getEditor } from '../canvas/editorRef'
import { useBoardUi } from '../core/store'
import { buildIndex, filterIndex, type SearchItem } from '../features/find/search'

/** ⌘K / Ctrl+K quick search: fuzzy-find shapes by content, kind, or #tag. */
export default function CmdK() {
  const { searchOpen, setSearchOpen, setHint } = useBoardUi()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [items, setItems] = useState<SearchItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(!useBoardUi.getState().searchOpen)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSearchOpen])

  useEffect(() => {
    if (!searchOpen) return
    const editor = getEditor()
    if (!editor) {
      setItems([])
      return
    }
    try {
      const shapes = editor.getCurrentPageShapes().map((s) => ({
        id: s.id as string,
        type: s.type,
        props: (s.props ?? {}) as Record<string, unknown>,
        meta: (s.meta ?? {}) as Record<string, unknown>,
      }))
      const assetName = (id: string) => {
        try {
          const asset = editor.getAsset(id as never) as
            | { props?: { name?: string } }
            | undefined
          return asset?.props?.name
        } catch {
          return undefined
        }
      }
      setItems(buildIndex(shapes, assetName))
    } catch {
      setItems([])
    }
    setQuery('')
    setActive(0)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [searchOpen])

  const results = useMemo(() => filterIndex(items, query), [items, query])
  const clamped = Math.min(active, Math.max(0, results.length - 1))

  const jump = (item: SearchItem) => {
    const editor = getEditor()
    if (!editor) return
    try {
      editor.select(item.id as never)
      editor.zoomToSelection()
      setHint(`Jumped to ${item.title.slice(0, 40)}`)
    } catch {
      setHint('Could not jump to that item')
    }
    setSearchOpen(false)
  }

  if (!searchOpen) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[15vh]"
      onClick={() => setSearchOpen(false)}
    >
      <div
        className="w-[min(560px,90vw)] overflow-hidden rounded-xl border border-white/10 bg-[#23262c] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((a) => Math.min(a + 1, results.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((a) => Math.max(a - 1, 0))
            } else if (e.key === 'Enter' && results[clamped]) {
              jump(results[clamped])
            } else if (e.key === 'Escape') {
              setSearchOpen(false)
            }
          }}
          placeholder="Search board… (content, type, #tag)"
          className="w-full bg-transparent px-4 py-3 text-sm outline-none placeholder:text-white/30"
        />
        <ul className="max-h-[40vh] overflow-auto border-t border-white/10 py-1">
          {results.map((item, i) => (
            <li key={item.id}>
              <button
                onMouseEnter={() => setActive(i)}
                onClick={() => jump(item)}
                className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm ${
                  i === clamped ? 'bg-white/10' : ''
                }`}
              >
                <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase text-white/50">
                  {item.kind}
                </span>
                <span className="truncate text-white/90">{item.title || '(empty)'}</span>
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-4 py-3 text-sm text-white/40">No matches</li>
          )}
        </ul>
      </div>
    </div>
  )
}
