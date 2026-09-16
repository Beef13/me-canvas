# Manual — what me-canvas does today

## Run it
```bash
npm install
npm run dev    # open the printed localhost URL
npm run build  # typecheck + production bundle
```

## What works (Phase 0+1)
- **Infinite canvas**: pan (space-drag / wheel), zoom (pinch / ctrl-wheel), select, move, resize — powered by tldraw.
- **Dump anything**:
  - Paste images or text anywhere (`Cmd/Ctrl+V`); image URLs are fetched and placed as images, other URLs become link cards.
  - Drop files onto the canvas — they land where you drop them; multi-file drops auto-tile in a grid.
  - Toolbar **Upload** button for file-picker dumps; **+ Note** for quick text.
- **Local-first**: every change autosaves to IndexedDB (~1s debounce). Reload and the board is back. No account, no network.
- **Export / Import**: toolbar buttons write/read a `.mcanvas.json` snapshot file.
- **Clear**: wipes the board (with confirm).
- **Status bar** (bottom-left): save state + what just happened.

## What works (Phase 2 — Organize)
- **Section frames**: `▢ Frame` creates a named container at the view center; drag items in.
- **Align / distribute / stack**: second toolbar row, enabled based on selection size (align 2+, distribute 3+).
- **Z-order**: forward / front / backward / back buttons for the selection.
- Selection count shown at the right of the organize bar.

## What works (Phase 3 — Find)
- **⌘K / Ctrl+K quick search**: fuzzy-find across text content, image filenames, shape types, and #tags. Enter jumps (selects + zooms) to the match.
- **Tags**: select anything → tag panel bottom-right → add/remove tags. Tags persist in snapshots and are searchable. Hover a tag chip to see remove; click removes from the whole selection.

## What works (Phase 4 — Polish)
- **First-run onboarding**: empty boards show a 3-step overlay (dismisses forever).
- **PNG / SVG export**: toolbar buttons export the selection, or the whole board when nothing is selected (2x scale, with background).
- **Backup / Import**: full-fidelity `.mcanvas.json` snapshot round-trip.
- **⤢ Fit**: zoom-to-fit for the whole board in the organize bar.
- **Honest skip messages**: unsupported file types report "N added, M skipped" instead of failing silently.

## What works (Collab — live duo boards)
- **👥 Collaborate** (toolbar): Host a room → copy invite link → guest opens link → Join. No account, no server; connects peer-to-peer.
- **Live shape sync**: creates, moves, edits, deletes replicate both ways within ~100ms.
- **Live cursors**: see each other's named, color-coded pointers.
- **Join flow**: guest pulls the host's full board (incl. image bytes) on join.
- **Conflict policy**: last-writer-wins per shape; undo is local-only; image assets over 25MB are skipped with a hint.
- **Test it**: open the app in two browser windows (or two machines), host in one, join in the other.

## Desktop app (Tauri) — PARKED
Desktop work is paused while web + collab are the focus (an unresolved webview
blackout is open). The `src-tauri/` shell is kept but not under active test.

## Known limits
- Single board, single device. No sync yet.
- Snapshots hold full images — very large boards will grow IndexedDB usage (OPFS tier planned).
- Image search covers filenames/tags, not OCR of pixels yet.

## Reviewing the code
Start at `src/App.tsx` → `src/canvas/BoardCanvas.tsx` → `src/features/dump/ingest.ts`.
Rules we hold ourselves to: `docs/WORKFLOW_RULES.md`. System design: `docs/ARCHITECTURE.md`.
