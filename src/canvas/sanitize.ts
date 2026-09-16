import type { Editor } from 'tldraw'

const COORD_KEYS = ['x', 'y', 'w', 'h'] as const

function isBadNumber(v: unknown): boolean {
  return typeof v === 'number' && !Number.isFinite(v)
}

/**
 * Remove shapes with non-finite geometry (NaN/Infinity from failed image
 * dimension loads or corrupted snapshots). One such shape can crash the
 * entire canvas render loop — unrenderable data must go.
 * Returns the number removed.
 */
export function sanitizeShapes(editor: Editor): number {
  let removed = 0
  try {
    const victims: never[] = []
    for (const shape of editor.getCurrentPageShapes()) {
      const s = shape as unknown as Record<string, unknown>
      const props = (s.props ?? {}) as Record<string, unknown>
      const bad =
        COORD_KEYS.some((k) => isBadNumber(s[k])) ||
        (isBadNumber(props.w) || isBadNumber(props.h))
      if (bad) victims.push(shape.id as never)
    }
    if (victims.length > 0) {
      try {
        editor.deleteShapes(victims)
        removed = victims.length
      } catch {
        // Deletion itself failed — leave the board untouched.
      }
    }
  } catch {
    // Inspection failed — leave the board untouched.
  }
  return removed
}
