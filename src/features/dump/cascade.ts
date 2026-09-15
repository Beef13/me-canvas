import type { PagePoint } from '../../core/types'

const TILE_W = 560
const TILE_H = 420
const GAP = 36

/**
 * Pure auto-tile layout: spread `count` items in a left-to-right,
 * top-to-bottom grid starting at `origin`. Keeps folder dumps readable
 * instead of stacking everything on one point (the PureRef pile problem).
 */
export function cascadePoints(
  count: number,
  origin: PagePoint,
  columns = 4,
): PagePoint[] {
  const cols = Math.max(1, Math.min(columns, Math.max(1, count)))
  return Array.from({ length: count }, (_, i) => ({
    x: origin.x + (i % cols) * (TILE_W + GAP),
    y: origin.y + Math.floor(i / cols) * (TILE_H + GAP),
  }))
}

/** Slight per-board offset so repeated pastes don't land exactly on top. */
export function nextDropOrigin(base: PagePoint, dropsSoFar: number): PagePoint {
  const step = 48
  const n = dropsSoFar % 8
  return { x: base.x + n * step, y: base.y + n * step }
}
