import type { Editor } from 'tldraw'

/**
 * Module-level editor handle. Set once in BoardCanvas `onMount`.
 * Lets toolbar / ingest code act on the canvas without prop drilling.
 */
let editor: Editor | null = null

export function setEditor(e: Editor | null) {
  editor = e
}

export function getEditor(): Editor | null {
  return editor
}
