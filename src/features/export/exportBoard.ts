import { exportAs, type Editor } from 'tldraw'

export type BoardExportFormat = 'png' | 'svg'

/**
 * Export the selection (or the whole page when nothing is selected)
 * as an image file download. tldraw handles rasterization.
 */
export async function exportBoardAs(
  editor: Editor,
  format: BoardExportFormat,
): Promise<string> {
  const selected = [...editor.getSelectedShapeIds()]
  const ids =
    selected.length > 0 ? selected : [...editor.getCurrentPageShapeIds()]
  if (ids.length === 0) return 'Nothing to export yet'
  await exportAs(editor, ids as never, {
    format,
    name: `me-canvas-${Date.now()}`,
    scale: 2,
    background: true,
  })
  return selected.length > 0
    ? `Exported ${selected.length} selected as ${format.toUpperCase()}`
    : `Exported board as ${format.toUpperCase()}`
}
