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
      useBoardUi
        .getState()
        .setSelectedIds([...editor.getSelectedShapeIds()] as string[])
    }
    sync()
    return editor.store.listen(sync, { scope: 'document' })
  }, [editor])
  return null
}
