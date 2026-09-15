/** Pure search index over board shapes. No editor imports: fully testable. */

export interface IndexShape {
  id: string
  type: string
  props?: Record<string, unknown>
  meta?: Record<string, unknown>
}

export interface SearchItem {
  id: string
  kind: string
  title: string
  detail: string
  tags: string[]
}

const SNIPPET_LEN = 80

/** Best-effort plain text from TipTap-ish richText or plain strings. */
export function plainText(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(plainText).join('')
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.text === 'string') return obj.text
    const parts: string[] = []
    for (const v of Object.values(obj)) {
      if (v && typeof v === 'object') parts.push(plainText(v))
    }
    return parts.join('')
  }
  return ''
}

function tagsOf(meta?: Record<string, unknown>): string[] {
  const tags = meta?.mcTags
  return Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : []
}

function titleFor(shape: IndexShape, assetName: (id: string) => string | undefined): string {
  const props = shape.props ?? {}
  switch (shape.type) {
    case 'text':
    case 'note':
    case 'geo':
      return plainText(props.richText ?? props.text).trim().slice(0, SNIPPET_LEN) || shape.type
    case 'frame':
      return String(props.name ?? 'Frame')
    case 'image':
    case 'video': {
      const assetId = props.assetId
      const name =
        typeof assetId === 'string' ? assetName(assetId) : undefined
      return name || shape.type
    }
    case 'bookmark':
    case 'embed':
      return String(props.url ?? shape.type)
    default:
      return shape.type
  }
}

export function buildIndex(
  shapes: IndexShape[],
  assetName: (id: string) => string | undefined,
): SearchItem[] {
  return shapes.map((s) => {
    const tags = tagsOf(s.meta)
    return {
      id: s.id,
      kind: s.type,
      title: titleFor(s, assetName),
      detail: [s.type, ...tags.map((t) => `#${t}`)].join(' · '),
      tags,
    }
  })
}

/** Case-insensitive match across title, kind, and tags. */
export function filterIndex(items: SearchItem[], query: string): SearchItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return items.slice(0, 50)
  return items
    .filter((item) =>
      `${item.title} ${item.kind} ${item.tags.join(' ')}`.toLowerCase().includes(q),
    )
    .slice(0, 50)
}
