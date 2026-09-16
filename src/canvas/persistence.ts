import type { Editor, TLEditorSnapshot } from 'tldraw'
import { useBoardUi } from '../core/store'
import { SNAPSHOT_KEY } from '../core/types'
import { kvGet, kvSet } from '../storage/db'

const DEBOUNCE_MS = 800

/**
 * Local-first persistence: debounce tldraw store snapshots into IndexedDB.
 * Returns an unsubscribe function. No login, no network, reload-safe.
 */
export function attachPersistence(editor: Editor): () => void {
  const { setSaveStatus } = useBoardUi.getState()
  let timer: ReturnType<typeof setTimeout> | null = null
  let disposed = false

  const save = async () => {
    timer = null
    if (disposed) return
    setSaveStatus('saving')
    try {
      await kvSet(SNAPSHOT_KEY, editor.getSnapshot())
      if (!disposed) setSaveStatus('saved')
    } catch {
      if (!disposed) setSaveStatus('error')
    }
  }

  const unlisten = editor.store.listen(
    () => {
      // Shape count drives toolbar badges — but geometry churns (drags fire
      // per pointer-move) must not re-render React. Only publish on add/remove.
      const n = editor.getCurrentPageShapeIds().size
      const ui = useBoardUi.getState()
      if (ui.shapeCount !== n) ui.setShapeCount(n)
      if (timer) clearTimeout(timer)
      timer = setTimeout(save, DEBOUNCE_MS)
    },
    { scope: 'document' },
  )

  useBoardUi.getState().setShapeCount(editor.getCurrentPageShapeIds().size)

  return () => {
    disposed = true
    if (timer) clearTimeout(timer)
    unlisten()
  }
}

/** Restore the last snapshot, if any. Returns true when something loaded. */
export async function restoreSnapshot(editor: Editor): Promise<boolean> {
  const { setSaveStatus } = useBoardUi.getState()
  try {
    const snap = await kvGet<TLEditorSnapshot>(SNAPSHOT_KEY)
    if (snap) {
      editor.loadSnapshot(snap)
      setSaveStatus('saved')
      return true
    }
  } catch {
    // Corrupt snapshot: start fresh rather than crash.
  }
  setSaveStatus('ready')
  return false
}
