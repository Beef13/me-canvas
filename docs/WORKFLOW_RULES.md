# Workflow Rules (living document)

How we build me-canvas. Updated whenever we learn something that should change our process.

## 1. Standards
- TypeScript strict. No `any` without a comment explaining why.
- Small pure functions in `core/` and `features/`; React only in `canvas/` and `ui/`.
- `core/` never imports React, tldraw, or DOM APIs. Canvas adapters live in `canvas/`.
- Every external-content path (paste/drop/upload/URL) goes through `features/dump/ingest.ts`.
- No duplicated handling: if tldraw owns an event natively, we either let it through or intercept in capture phase with `stopPropagation` — never both.

## 2. Performance budget
- Paste of 100 images tiles in <1s; pan stays at 60fps.
- Persistence is debounced (800ms) snapshot → IndexedDB; never block the UI thread on save.
- Thumbnails before full-res; lazy decode; LRU thinking for anything >200 items.

## 3. Verification
- `npm run build` must pass before any commit.
- Manual smoke test for canvas changes: paste image, drop folder, reload (persistence), export/import.
- If a tldraw API is uncertain, check `node_modules/@tldraw/editor/dist-cjs/index.d.ts` before coding, not after.

## 4. Learnings log
- 2026-09-16: tldraw v5 external content API is `putExternalContent({type:'files'|'text'|'url', ...})` with optional `point`. Text/URL insertion should use it instead of version-fragile `createShape` rich-text props.
- 2026-09-16: `editor.store.listen` without a `source` filter catches programmatic + user changes; `source:'user'` risks missing `putExternalContent` writes.
- 2026-09-16: Tailwind v4 = `@import "tailwindcss"` + `@tailwindcss/vite` plugin. No config file needed.
- 2026-09-16: tldraw v5 snapshots live on `editor` (`getSnapshot`/`loadSnapshot`), not `editor.store`. `store.listen` is the change hook.
- 2026-09-16: NEVER intercept tldraw native paste. Our capture-phase paste handler blocked tldraw's own pipeline and silently broke pasting. Only intercept multi-file drops ( singles pass through). Native first, enhance second.
- 2026-09-16: `.mc-canvas` collapsed to 0px height because `flex:1` on a block child of a non-flex parent does nothing. Canvas wrapper must be `position:absolute; inset:0` inside the relative parent. Always give the Tldraw container explicit bounds.
- 2026-09-16: Tags via `shape.meta.mcTags` + `editor.updateShapes` — no custom shape types needed. Search index (`features/find/search.ts`) takes plain data + an asset-name callback, keeping it pure and editor-free.
- 2026-09-16: `useEditor` comes from `tldraw` main entry (re-exported). Components needing editor context (SelectionBridge) must render as `<Tldraw>` children; everything else uses the module-level `editorRef`.
- 2026-09-16: Image export = `exportAs(editor, ids, {format:'png'|'svg', scale, background})` from `tldraw`. Selection-or-page fallback keeps one button correct in both cases.
- 2026-09-16: Tauri scaffold via `tauri init --ci`, then hand-fix: `frontendDist ../dist`, `devUrl localhost:1420`, fixed vite `strictPort`. Static `import` of `@tauri-apps/api` is browser-safe (no-ops until invoked). Always `cargo check` after touching `src-tauri/`.
- 2026-09-16: Desktop drops from Finder are invisible to DataTransfer in Tauri webviews — use `onDragDropEvent` (paths) + `plugin-fs readFile`. `core:window:default` does NOT include `allow-set-always-on-top`; grant it explicitly. Never swallow Tauri IPC errors — console.error them.
- 2026-09-16: tldraw's default external-content handler calls `zoomToSelection` when new content lands off-viewport — drops must snapshot/restore the camera (`ingest.ts`). Store→React bridges (`persistence`, `SelectionBridge`) must identity-compare before set, or drags re-render every pointer-move.
- (append new learnings here with date)
