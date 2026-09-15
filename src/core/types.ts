/** Shared board-domain types. UI-agnostic: `core/` never imports React. */

export interface PagePoint {
  x: number
  y: number
}

/** Snapshot persistence key + DB names. Bump suffix to invalidate old data. */
export const SNAPSHOT_KEY = 'me-canvas:snapshot:v1'
export const DB_NAME = 'me-canvas'
export const DB_STORE = 'kv'

/** Status shown in the status bar. */
export type SaveStatus = 'loading' | 'ready' | 'saving' | 'saved' | 'error'
