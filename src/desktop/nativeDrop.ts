import { readFile } from '@tauri-apps/plugin-fs'
import type { PhysicalPosition } from '@tauri-apps/api/dpi'
import { getCurrentWebview } from '@tauri-apps/api/webview'

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  pdf: 'application/pdf',
}

/**
 * Tauri-only file drops. The desktop webview does not expose Finder drops
 * via DataTransfer, so we use the native drag-drop event (paths) + fs reads.
 * Directories and out-of-scope paths are skipped; the caller reports counts.
 */
export async function onNativeFileDrop(
  cb: (files: File[], total: number, position: PhysicalPosition) => void,
): Promise<() => void> {
  return getCurrentWebview().onDragDropEvent(async (event) => {
    if (event.payload.type !== 'drop') return
    const paths = event.payload.paths
    const out: File[] = []
    for (const path of paths) {
      try {
        const bytes = await readFile(path)
        const name = path.split('/').pop() || 'dropped-file'
        const ext = name.split('.').pop()?.toLowerCase() ?? ''
        out.push(
          new File([bytes as BlobPart], name, {
            type: MIME_BY_EXT[ext] ?? 'application/octet-stream',
          }),
        )
      } catch {
        // Unreadable (directory, permissions, out of fs scope) — skipped.
      }
    }
    cb(out, paths.length, event.payload.position)
  })
}
