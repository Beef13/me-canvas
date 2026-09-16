import { useBoardUi } from '../core/store'

const STATUS_LABEL: Record<string, string> = {
  loading: 'Loading…',
  ready: 'Local',
  saving: 'Saving…',
  saved: 'Saved locally',
  error: 'Save failed',
}

/** Bottom-left status: persistence state + last action hint. */
export default function StatusBar() {
  const { saveStatus, hint } = useBoardUi()
  return (
    <footer className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2">
      <span className="rounded-full bg-black/75 px-2.5 py-1 text-[11px] text-white/80">
        ● {STATUS_LABEL[saveStatus] ?? saveStatus}
      </span>
      <span className="max-w-[50vw] truncate rounded-full bg-black/75 px-2.5 py-1 text-[11px] text-white/60">
        {hint}
      </span>
    </footer>
  )
}
