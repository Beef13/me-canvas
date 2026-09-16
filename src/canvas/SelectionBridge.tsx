import { useEffect } from 'react'
import { useEditor } from 'tldraw'
import { useBoardUi } from '../core/store'

/**
 * Lives inside <Tldraw> so it can useEditor(). Mirrors selection into the
 * global UI store so outside components (toolbar, tag panel) stay in sync.
 */
export default function SelectionBridge() {
  const editor = useEditor()
  useEffect(() => {
    const sync = () => {
      // Identity-compare: document churn must not bump the revision and
      // re-render the organize bar / tag panel mid-drag.
      const ids = [...editor.getSelectedShapeIds()] as string[]
      const prev = useBoardUi.getState().selectedIds
      if (ids.length !== prev.length || ids.some((id, i) => id !== prev[i])) {
        useBoardUi.getState().setSelectedIds(ids)
      }
    }
    sync()
    return editor.store.listen(sync, { scope: 'document' })
  }, [editor])
  return null
}
