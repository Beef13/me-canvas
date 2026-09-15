import { getEditor } from '../canvas/editorRef'
import { useBoardUi } from '../core/store'
import {
  alignSelection,
  createFrameAtCenter,
  distributeSelection,
  reorderSelection,
  stackSelection,
  type AlignOp,
  type DistributeOp,
  type ReorderDir,
} from '../features/organize/organize'

function Action({
  label,
  title,
  disabled,
  onClick,
}: {
  label: string
  title: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="rounded px-1.5 py-1 text-xs text-white/70 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
    >
      {label}
    </button>
  )
}

/** Second toolbar row: frames, align, distribute, stack, z-order. */
export default function OrganizeBar() {
  const { selectedIds, setHint } = useBoardUi()
  const n = selectedIds.length

  const run = (fn: (e: NonNullable<ReturnType<typeof getEditor>>) => string) => {
    const editor = getEditor()
    if (!editor) return
    try {
      setHint(fn(editor))
    } catch {
      setHint('That did not work on the current selection')
    }
  }

  const align = (op: AlignOp) => run((e) => alignSelection(e, op))
  const distribute = (op: DistributeOp) => run((e) => distributeSelection(e, op))
  const stack = (op: DistributeOp) => run((e) => stackSelection(e, op))
  const reorder = (dir: ReorderDir) => run((e) => reorderSelection(e, dir))

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-white/10 bg-[#20232a] px-3 py-1">
      <Action
        label="⤢ Fit"
        title="Zoom to fit all content"
        onClick={() =>
          run((e) => {
            e.zoomToFit()
            return 'Zoomed to fit'
          })
        }
      />
      <span className="mx-1 h-4 w-px bg-white/10" />
      <Action label="▢ Frame" title="New section frame at view center" onClick={() => run(createFrameAtCenter)} />
      <span className="mx-1 h-4 w-px bg-white/10" />
      <Action label="⇤" title="Align left" disabled={n < 2} onClick={() => align('left')} />
      <Action label="⇔" title="Align center horizontally" disabled={n < 2} onClick={() => align('center-horizontal')} />
      <Action label="⇥" title="Align right" disabled={n < 2} onClick={() => align('right')} />
      <Action label="⤒" title="Align top" disabled={n < 2} onClick={() => align('top')} />
      <Action label="⇕" title="Align center vertically" disabled={n < 2} onClick={() => align('center-vertical')} />
      <Action label="⤓" title="Align bottom" disabled={n < 2} onClick={() => align('bottom')} />
      <span className="mx-1 h-4 w-px bg-white/10" />
      <Action label="⇄ Dist" title="Distribute horizontally (3+)" disabled={n < 3} onClick={() => distribute('horizontal')} />
      <Action label="⇅ Dist" title="Distribute vertically (3+)" disabled={n < 3} onClick={() => distribute('vertical')} />
      <Action label="≣ Stack" title="Stack horizontally" disabled={n < 2} onClick={() => stack('horizontal')} />
      <Action label="≣⋮" title="Stack vertically" disabled={n < 2} onClick={() => stack('vertical')} />
      <span className="mx-1 h-4 w-px bg-white/10" />
      <Action label="↑" title="Bring forward" disabled={n === 0} onClick={() => reorder('forward')} />
      <Action label="⇑" title="Bring to front" disabled={n === 0} onClick={() => reorder('front')} />
      <Action label="↓" title="Send backward" disabled={n === 0} onClick={() => reorder('backward')} />
      <Action label="⇓" title="Send to back" disabled={n === 0} onClick={() => reorder('back')} />
      {n > 0 && <span className="ml-auto text-[11px] text-white/40">{n} selected</span>}
    </div>
  )
}
