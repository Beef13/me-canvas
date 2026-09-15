# Architecture (V1)

## Stack
React 19 + Vite + TypeScript + Tailwind v4 + Zustand + tldraw v5 + `idb` (IndexedDB).
Yjs is installed for the future CRDT/collab layer; V1 persistence is tldraw snapshots.

## Why tldraw owns the canvas
Infinite pan/zoom, camera, selection, snapping, and image asset pipeline come free.
We do not reimplement rendering. Our code adds placement, ingest, and persistence.

## Module map
```
src/
  core/        types.ts (PagePoint, keys), store.ts (Zustand UI state only)
  canvas/      BoardCanvas.tsx (mount + capture-phase dump interception)
               persistence.ts (debounced snapshot save / restore)
               editorRef.ts (module-level editor handle, avoids prop drilling)
  features/
    dump/      ingest.ts (files/text/URL → editor, the single dump entry)
               cascade.ts (pure auto-tile grid math)
    organize/  organize.ts (frames, align/distribute/stack, z-order — thin editor wrappers)
    find/      search.ts (pure searchable index + filter, no editor imports)
               tags.ts (tags in shape.meta.mcTags — no custom shapes needed)
    export/    exportBoard.ts (selection-or-page PNG/SVG via tldraw exportAs)
  storage/     db.ts (tiny idb key-value wrapper)
  ui/          Toolbar.tsx (note/upload/png/svg/backup/import/clear/search)
               OrganizeBar.tsx (fit/frame/align/distribute/stack/z-order row)
               CmdK.tsx (⌘K quick-search dialog)
               TagPanel.tsx (floating tag editor for selection)
               Onboarding.tsx (first-run overlay, idb-dismissed)
               StatusBar.tsx (save state + hints)
```

## Data flow
1. Paste/drop/upload → `ingestFiles` / `ingestText` → `editor.putExternalContent` with a cascaded `point`.
2. Any document change → `persistence` listener (debounced 800ms) → snapshot → IndexedDB (`me-canvas:snapshot:v1`).
3. Reload → `restoreSnapshot` → `editor.store.loadSnapshot`.

## Key decisions
- Node/asset split (light JSON vs heavy blobs) is delegated to tldraw assets + IndexedDB snapshot for V1; OPFS thumbnail tier comes when 5k-image boards need it.
- Capture-phase interception only for *external* files/text; internal tldraw DnD passes through untouched (checked via clipboard/DataTransfer types).
- Multi-file dumps tile in a grid (`cascadePoints`) instead of stacking — the anti-PureRef-pile behavior.

## Non-goals (V1)
Realtime multiplayer, accounts/billing, AI search/layout, mobile app, connectors/pen tools.
