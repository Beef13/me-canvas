import type { Editor } from 'tldraw'
import type { PagePoint } from '../../core/types'
import { cascadePoints } from './cascade'

const IMAGE_URL_RE = /^https?:\/\/\S+\.(png|jpe?g|gif|webp|avif|svg)(\?\S*)?$/i

function viewportOrigin(editor: Editor): PagePoint {
  try {
    const center = editor.getViewportScreenCenter()
    return editor.screenToPage(center)
  } catch {
    return { x: 0, y: 0 }
  }
}

/**
 * Dump files onto the canvas, auto-tiled from `origin` (or viewport center).
 * One `putExternalContent` call per file keeps tldraw's asset pipeline
 * (thumbnails, dimensions) intact while we control placement.
 */
export async function ingestFiles(
  editor: Editor,
  files: File[],
  origin?: PagePoint,
): Promise<number> {
  const list = files.filter((f) => f.size > 0)
  if (list.length === 0) return 0
  const base = origin ?? viewportOrigin(editor)
  const points = cascadePoints(list.length, base)

  let placed = 0
  for (let i = 0; i < list.length; i++) {
    try {
      await editor.putExternalContent({
        type: 'files',
        files: [list[i]],
        point: points[i],
      })
      placed++
    } catch {
      // Skip unreadable files; keep the rest of the dump going.
    }
  }
  return placed
}

/** Dump text / links. Image URLs are fetched and placed as images. */
export async function ingestText(
  editor: Editor,
  raw: string,
  origin?: PagePoint,
): Promise<void> {
  const text = raw.trim()
  if (!text) return
  const base = origin ?? viewportOrigin(editor)

  if (IMAGE_URL_RE.test(text)) {
    try {
      const res = await fetch(text)
      const blob = await res.blob()
      const name = text.split('/').pop()?.split('?')[0] || 'pasted-image'
      await ingestFiles(editor, [new File([blob], name, { type: blob.type })], base)
      return
    } catch {
      // Fall through to plain-text placement.
    }
  }

  if (/^https?:\/\/\S+$/.test(text)) {
    await editor.putExternalContent({ type: 'url', url: text, point: base })
  } else {
    await editor.putExternalContent({ type: 'text', text, point: base })
  }
}

/** Clipboard / DataTransfer helpers — the "dump anything" entry points. */
export function filesFromDataTransfer(dt: DataTransfer | null): File[] {
  if (!dt) return []
  return Array.from(dt.files ?? [])
}

export function textFromDataTransfer(dt: DataTransfer | null): string {
  return dt?.getData('text/plain') ?? ''
}

/** True when the event carries outside files (not an internal canvas move). */
export function isExternalFileDrop(e: DragEvent): boolean {
  return Array.from(e.dataTransfer?.types ?? []).includes('Files')
}

/** True when the paste holds files or plain text (not internal tldraw data). */
export function isExternalPaste(e: ClipboardEvent): boolean {
  const types = Array.from(e.clipboardData?.types ?? [])
  if (types.includes('Files')) return true
  return types.includes('text/plain') && !types.some((t) => t.startsWith('text/tldraw'))
}
