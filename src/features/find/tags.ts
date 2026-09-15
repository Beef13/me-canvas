import type { Editor, TLShapeId } from 'tldraw'

/** Tags live in shape `meta` under a namespaced key — no custom shapes needed. */
const META_KEY = 'mcTags'

interface Taggable {
  id: TLShapeId
  type: string
  meta?: Record<string, unknown> | null
}

export function getTags(shape: Pick<Taggable, 'meta'>): string[] {
  const tags = shape.meta?.[META_KEY]
  return Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : []
}

export function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 32)
}

export function setTags(editor: Editor, ids: TLShapeId[], tags: string[]): void {
  const partials = ids.map((id) => {
    const shape = editor.getShape(id) as Taggable | undefined
    return {
      id,
      type: shape?.type ?? 'geo',
      meta: { ...(shape?.meta ?? {}), [META_KEY]: tags },
    }
  })
  editor.updateShapes(partials as never)
}

export function addTagToSelection(editor: Editor, raw: string): string[] {
  const tag = normalizeTag(raw)
  if (!tag) return []
  const ids = [...editor.getSelectedShapeIds()]
  const merged = new Set<string>()
  for (const id of ids) {
    const shape = editor.getShape(id) as Taggable | undefined
    if (shape) getTags(shape).forEach((t) => merged.add(t))
  }
  merged.add(tag)
  const next = [...merged].sort()
  setTags(editor, ids, next)
  return next
}

export function removeTagFromSelection(editor: Editor, tag: string): string[] {
  const ids = [...editor.getSelectedShapeIds()]
  const remaining = new Set<string>()
  for (const id of ids) {
    const shape = editor.getShape(id) as Taggable | undefined
    if (shape) getTags(shape).forEach((t) => t !== tag && remaining.add(t))
  }
  const next = [...remaining].sort()
  setTags(editor, ids, next)
  return next
}
