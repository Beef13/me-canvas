import { createShapeId, type Editor } from 'tldraw'

export type AlignOp =
  | 'left'
  | 'center-horizontal'
  | 'right'
  | 'top'
  | 'center-vertical'
  | 'bottom'
export type DistributeOp = 'horizontal' | 'vertical'
export type ReorderDir = 'forward' | 'backward' | 'front' | 'back'

let frameCount = 0

function selection(editor: Editor): string[] {
  return [...editor.getSelectedShapeIds()] as string[]
}

/** Create an empty section frame at the viewport center. */
export function createFrameAtCenter(editor: Editor): string {
  const center = editor.screenToPage(editor.getViewportScreenCenter())
  const id = createShapeId()
  editor.createShape({
    id,
    type: 'frame',
    x: center.x - 800,
    y: center.y - 500,
    props: { w: 1600, h: 1000, name: `Section ${++frameCount}` },
  })
  editor.select(id)
  return `Section ${frameCount} created — drag items into it`
}

export function alignSelection(editor: Editor, op: AlignOp): string {
  const ids = selection(editor)
  if (ids.length < 2) return 'Select 2+ items to align'
  editor.alignShapes(ids as never, op)
  return `Aligned (${op})`
}

export function distributeSelection(editor: Editor, op: DistributeOp): string {
  const ids = selection(editor)
  if (ids.length < 3) return 'Select 3+ items to distribute'
  editor.distributeShapes(ids as never, op)
  return `Distributed ${op}ly`
}

export function stackSelection(editor: Editor, op: DistributeOp): string {
  const ids = selection(editor)
  if (ids.length < 2) return 'Select 2+ items to stack'
  editor.stackShapes(ids as never, op, 32)
  return `Stacked ${op}ly`
}

export function reorderSelection(editor: Editor, dir: ReorderDir): string {
  const ids = selection(editor)
  if (ids.length === 0) return 'Select something first'
  const actions = {
    forward: () => editor.bringForward(ids as never),
    backward: () => editor.sendBackward(ids as never),
    front: () => editor.bringToFront(ids as never),
    back: () => editor.sendToBack(ids as never),
  }
  actions[dir]()
  return { forward: 'Brought forward', backward: 'Sent backward', front: 'Brought to front', back: 'Sent to back' }[dir]
}
