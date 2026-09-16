import { getCurrentWindow } from '@tauri-apps/api/window'

/**
 * Desktop bridge. Every function is browser-safe: outside Tauri they
 * report `false` / no-op instead of throwing, so the web build is untouched.
 */
export function isTauri(): boolean {
  return '__TAURI_INTERNALS__' in window || '__TAURI__' in window
}

export async function isPinned(): Promise<boolean> {
  if (!isTauri()) return false
  try {
    return await getCurrentWindow().isAlwaysOnTop()
  } catch {
    return false
  }
}

export async function setPinned(pin: boolean): Promise<boolean> {
  if (!isTauri()) return false
  try {
    await getCurrentWindow().setAlwaysOnTop(pin)
    return pin
  } catch (err) {
    // Surfaced (not swallowed): permission denials show up in dev logs.
    console.error('[me-canvas] setAlwaysOnTop failed:', err)
    return false
  }
}
