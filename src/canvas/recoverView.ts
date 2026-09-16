import type { Editor } from 'tldraw'

/**
 * If the camera is looking at literally nothing (viewport overlaps no
 * shape at all) while shapes exist, the view was lost — pull it back.
 * Returns true when a recovery happened.
 */
export function recoverLostView(editor: Editor): boolean {
  if (!seesContent(editor)) {
    try {
      editor.stopCameraAnimation()
      editor.zoomToFit()
      return true
    } catch {
      // Measurement failed — leave the camera alone.
    }
  }
  return false
}

/**
 * Post-drop safety net: a miscalculated drop point can strand content
 * off-screen (which also used to trigger tldraw's zoom-to-content).
 * Centers dropped items instead of leaving a black view.
 */
export function ensureContentVisible(editor: Editor): boolean {
  return recoverLostView(editor)
}

function seesContent(editor: Editor): boolean {
  try {
    const ids = [...editor.getCurrentPageShapeIds()]
    if (ids.length === 0) return true
    const view = editor.getViewportPageBounds()
    const overlaps = (b: { x: number; y: number; w: number; h: number }) =>
      b.x < view.x + view.w && b.x + b.w > view.x && b.y < view.y + view.h && b.y + b.h > view.y
    return ids.some((id) => {
      try {
        const b = editor.getShapePageBounds(id)
        return !!b && overlaps(b)
      } catch {
        return false
      }
    })
  } catch {
    return true
  }
}
