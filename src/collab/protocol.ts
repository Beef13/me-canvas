/** Wire protocol for duo collaboration (PeerJS star topology). */

export interface Presence {
  peerId: string
  name: string
  color: string
}

export interface AssetBlob {
  mime: string
  data: ArrayBuffer
}

export type WireMsg =
  | { kind: 'hello'; peerId: string; name: string; color: string }
  | { kind: 'roster'; peers: Presence[] }
  | { kind: 'snapshot-request' }
  | { kind: 'snapshot'; snapshot: unknown; assets: Record<string, AssetBlob> }
  | {
      kind: 'ops'
      origin: string
      msgId: string
      added: unknown[]
      updated: unknown[]
      removed: string[]
      assets: Record<string, AssetBlob>
    }
  | { kind: 'cursor'; peerId: string; name: string; color: string; x: number; y: number }
  | { kind: 'bye'; peerId: string }

export const ASSET_BYTES_LIMIT = 25 * 1024 * 1024

const PALETTE = [
  '#02B1CC', '#39B178', '#7B66DC', '#E34BA9',
  '#EC5E41', '#FF802B', '#9D5BD2', '#55B467',
]

/** Stable color per peer id. */
export function peerColor(peerId: string): string {
  let h = 0
  for (let i = 0; i < peerId.length; i++) h = (h * 31 + peerId.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

export function roomIdFromHash(): string | null {
  const m = window.location.hash.match(/room=([A-Za-z0-9_-]+)/)
  return m ? m[1] : null
}

export function roomLink(roomId: string): string {
  const url = new URL(window.location.href)
  url.hash = `room=${roomId}`
  return url.toString()
}
