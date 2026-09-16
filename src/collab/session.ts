import { Peer, type DataConnection } from 'peerjs'
import type { Editor } from 'tldraw'
import {
  ASSET_BYTES_LIMIT,
  peerColor,
  type AssetBlob,
  type Presence,
  type WireMsg,
} from './protocol'

interface SessionEvents {
  onRoster: (peers: Presence[]) => void
  onStatus: (msg: string) => void
}

interface Rec {
  id: string
  typeName?: string
  props?: Record<string, unknown>
}

/**
 * Live duo session over PeerJS (free public signaling, no backend).
 * Star topology: the host relays ops/cursors between guests.
 *
 * Conflict policy (V1, documented): last-writer-wins per record, undo is
 * local-only, assets over 25MB are skipped with a hint.
 */
export class CollabSession {
  private peer: Peer
  private conns = new Map<string, DataConnection>()
  private seen = new Set<string>()
  private counter = 0
  private cursorAt = 0
  private unlisten: (() => void) | null = null
  private disposed = false

  readonly roomId: string
  readonly isHost: boolean
  readonly self: Presence
  private editor: Editor
  private events: SessionEvents

  private constructor(
    peer: Peer,
    roomId: string,
    isHost: boolean,
    self: Presence,
    editor: Editor,
    events: SessionEvents,
  ) {
    this.peer = peer
    this.roomId = roomId
    this.isHost = isHost
    this.self = self
    this.editor = editor
    this.events = events
  }

  static host(editor: Editor, name: string, events: SessionEvents): Promise<CollabSession> {
    return new Promise((resolve, reject) => {
      const peer = new Peer(`mc-${randomSuffix()}`)
      peer.on('open', (id) => {
        const session = new CollabSession(peer, id, true, makeSelf(id, name), editor, events)
        session.attachHost()
        session.attachStore()
        events.onStatus('Room live — share the link')
        resolve(session)
      })
      peer.on('error', (err) => {
        events.onStatus(`Connection error: ${err.type}`)
        if (!peer.open) reject(err)
      })
    })
  }

  static join(editor: Editor, roomId: string, name: string, events: SessionEvents): Promise<CollabSession> {
    return new Promise((resolve, reject) => {
      const peer = new Peer(`mc-${randomSuffix()}`)
      peer.on('open', (id) => {
        const session = new CollabSession(peer, roomId, false, makeSelf(id, name), editor, events)
        session.attachStore()
        const conn = peer.connect(roomId, { reliable: true })
        conn.on('open', () => {
          session.addConn(roomId, conn)
          session.sendTo(conn, { kind: 'hello', ...session.self })
          session.sendTo(conn, { kind: 'snapshot-request' })
          events.onStatus('Joined — pulling board…')
          resolve(session)
        })
        conn.on('data', (d) => session.onData(roomId, d as WireMsg))
        conn.on('close', () => session.onClose(roomId))
        conn.on('error', () => session.onClose(roomId))
        setTimeout(() => {
          if (!conn.open) {
            events.onStatus('Could not reach host — check the link')
            peer.destroy()
            reject(new Error('join-timeout'))
          }
        }, 12_000)
      })
      peer.on('error', (err) => {
        events.onStatus(`Connection error: ${err.type}`)
        reject(err)
      })
    })
  }

  leave() {
    if (this.disposed) return
    this.disposed = true
    this.unlisten?.()
    for (const conn of this.conns.values()) {
      try {
        conn.send({ kind: 'bye', peerId: this.self.peerId })
      } catch {
        // Already gone.
      }
      conn.close()
    }
    this.conns.clear()
    this.peer.destroy()
  }

  sendCursor(x: number, y: number) {
    const now = Date.now()
    if (now - this.cursorAt < 80) return
    this.cursorAt = now
    this.broadcast({ kind: 'cursor', ...this.self, x, y })
  }

  // ---- wiring ----

  private attachHost() {
    this.peer.on('connection', (conn) => {
      const guestId = conn.peer
      conn.on('open', () => {
        this.addConn(guestId, conn)
        this.pushRoster()
      })
      conn.on('data', (d) => this.onData(guestId, d as WireMsg))
      conn.on('close', () => this.onClose(guestId))
      conn.on('error', () => this.onClose(guestId))
    })
  }

  private attachStore() {
    this.unlisten = this.editor.store.listen((entry) => {
      if (entry.source !== 'user' || this.disposed) return
      void this.forwardOps(entry.changes)
    })
  }

  private addConn(id: string, conn: DataConnection) {
    this.conns.set(id, conn)
  }

  private onClose(id: string) {
    this.conns.delete(id)
    if (this.isHost) this.pushRoster()
    else this.events.onStatus('Host left — session over')
  }

  private roster(): Presence[] {
    // Host view: self + every connected guest (name fills in on hello).
    const peers = [this.self]
    for (const id of this.conns.keys()) {
      peers.push({ peerId: id, name: this.names.get(id) ?? shortId(id), color: peerColor(id) })
    }
    return peers
  }

  private names = new Map<string, string>()

  private pushRoster() {
    const peers = this.roster()
    this.events.onRoster(peers)
    this.broadcast({ kind: 'roster', peers })
  }

  // ---- messages ----

  private sendTo(conn: DataConnection, msg: WireMsg) {
    try {
      if (conn.open) conn.send(msg)
    } catch {
      // Dropped — presence/ops are fire-and-forget at this tier.
    }
  }

  private broadcast(msg: WireMsg, except?: string) {
    for (const [id, conn] of this.conns) {
      if (id !== except) this.sendTo(conn, msg)
    }
  }

  private onData(from: string, msg: WireMsg) {
    switch (msg.kind) {
      case 'hello':
        this.names.set(from, msg.name)
        if (this.isHost) this.pushRoster()
        break
      case 'roster':
        this.events.onRoster(msg.peers)
        break
      case 'snapshot-request':
        if (this.isHost) void this.sendSnapshot(from)
        break
      case 'snapshot':
        this.applySnapshot(msg.snapshot, msg.assets)
        this.events.onStatus('Board synced')
        break
      case 'ops':
        if (this.seen.has(msg.msgId)) return
        this.seen.add(msg.msgId)
        if (this.seen.size > 500) {
          const first = this.seen.values().next().value
          if (first) this.seen.delete(first)
        }
        this.applyOps(msg)
        // Host relays guest ops to everyone else.
        if (this.isHost) this.broadcast(msg, from)
        break
      case 'cursor':
        cursorBus.set(msg.peerId, { ...msg, at: Date.now() })
        if (this.isHost) this.broadcast(msg, from)
        break
      case 'bye':
        this.names.delete(from)
        cursorBus.delete(from)
        if (this.isHost) this.pushRoster()
        break
    }
  }

  // ---- ops ----

  private async forwardOps(changes: {
    added: Record<string, unknown>
    updated: Record<string, [unknown, unknown]>
    removed: Record<string, unknown>
  }) {
    const added = Object.values(changes.added)
    const updated = Object.values(changes.updated).map(([, to]) => to)
    const removed = Object.keys(changes.removed)
    if (added.length + updated.length + removed.length === 0) return
    const assets = await harvestAssets([...added, ...updated])
    const msg: WireMsg = {
      kind: 'ops',
      origin: this.self.peerId,
      msgId: `${this.self.peerId}:${++this.counter}`,
      added,
      updated,
      removed,
      assets,
    }
    this.broadcast(msg)
  }

  private applyOps(msg: Extract<WireMsg, { kind: 'ops' }>) {
    const editor = this.editor
    try {
      editor.store.mergeRemoteChanges(() => {
        const records: unknown[] = []
        for (const rec of [...msg.added, ...msg.updated]) {
          records.push(reviveRecord(rec, msg.assets))
        }
        if (records.length > 0) editor.store.put(records as never[])
        if (msg.removed.length > 0) editor.store.remove(msg.removed as never[])
      })
    } catch {
      this.events.onStatus('Missed a remote update')
    }
  }

  private async sendSnapshot(to: string) {
    const conn = this.conns.get(to)
    if (!conn) return
    try {
      const snapshot = this.editor.store.getStoreSnapshot()
      const records = Object.values((snapshot as { store: Record<string, unknown> }).store ?? {})
      const assets = await harvestAssets(records)
      this.sendTo(conn, { kind: 'snapshot', snapshot, assets })
    } catch {
      this.events.onStatus('Snapshot send failed')
    }
  }

  private applySnapshot(snapshot: unknown, assets: Record<string, AssetBlob>) {
    try {
      const snap = snapshot as { store: Record<string, unknown> }
      const revived = Object.values(snap.store ?? {}).map((rec) => reviveRecord(rec, assets))
      const next = {
        ...snap,
        store: Object.fromEntries(revived.map((r) => [(r as Rec).id, r])),
      }
      this.editor.store.mergeRemoteChanges(() => {
        this.editor.store.loadStoreSnapshot(next as never)
      })
      this.events.onStatus('Board synced')
    } catch {
      this.events.onStatus('Board sync failed')
    }
  }
}

// ---- assets: blob: URLs are local-only, so bytes travel with the ops ----

async function harvestAssets(records: unknown[]): Promise<Record<string, AssetBlob>> {
  const out: Record<string, AssetBlob> = {}
  for (const rec of records) {
    const r = rec as Rec
    if (r.typeName !== 'asset' || !r.props || typeof r.props.src !== 'string') continue
    const src = r.props.src
    if (!src.startsWith('blob:')) continue
    try {
      const res = await fetch(src)
      const blob = await res.blob()
      if (blob.size > ASSET_BYTES_LIMIT || blob.size === 0) continue
      out[r.id] = { mime: blob.type, data: await blob.arrayBuffer() }
    } catch {
      // Unreadable asset — remote side keeps a broken frame; acceptable V1.
    }
  }
  return out
}

function reviveRecord(rec: unknown, assets: Record<string, AssetBlob>): unknown {
  const r = { ...(rec as Rec) } as Rec
  const blob = assets[r.id]
  if (blob && r.props && typeof r.props.src === 'string' && r.props.src.startsWith('blob:')) {
    const file = new Blob([blob.data], { type: blob.mime })
    r.props = { ...r.props, src: URL.createObjectURL(file) }
  }
  return r
}

// ---- module-level session handle + cursor bus ----

let current: CollabSession | null = null
export function getSession(): CollabSession | null {
  return current
}
export function setSession(s: CollabSession | null) {
  current = s
}

/** Latest cursor per peer; RemoteCursors renders + expires entries. */
export const cursorBus = new Map<string, Presence & { x: number; y: number; at: number }>()

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8)
}

function shortId(id: string): string {
  return id.replace(/^mc-/, '').slice(0, 4)
}

function makeSelf(id: string, name: string): Presence {
  return { peerId: id, name: name.trim() || `Guest-${shortId(id)}`, color: peerColor(id) }
}
