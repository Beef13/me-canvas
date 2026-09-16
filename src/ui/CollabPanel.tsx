import { useEffect, useState } from 'react'
import { getEditor } from '../canvas/editorRef'
import { roomIdFromHash, roomLink } from '../collab/protocol'
import { CollabSession, getSession, setSession } from '../collab/session'
import { useBoardUi } from '../core/store'

const NAME_KEY = 'me-canvas:name'

/** Host / join flow for live duo sessions. */
export default function CollabPanel() {
  const { collabOpen, setCollabOpen, peers, setPeers, setHint } = useBoardUi()
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? '')
  const [roomInput, setRoomInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [inRoom, setInRoom] = useState(false)
  const session = getSession()

  useEffect(() => {
    if (collabOpen && !roomInput) {
      const fromLink = roomIdFromHash()
      if (fromLink) setRoomInput(fromLink)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collabOpen ])

  if (!collabOpen) return null

  const events = {
    onRoster: setPeers,
    onStatus: setHint,
  }

  const needEditor = () => {
    const editor = getEditor()
    if (!editor) setHint('Canvas still loading…')
    return editor
  }

  const host = async () => {
    const editor = needEditor()
    if (!editor || busy) return
    setBusy(true)
    try {
      const s = await CollabSession.host(editor, displayName(), events)
      setSession(s)
      setInRoom(true)
      setHint('Room live — share the link')
    } catch {
      setHint('Could not start room (signaling unreachable?)')
    } finally {
      setBusy(false)
    }
  }

  const join = async () => {
    const editor = needEditor()
    const roomId = roomInput.trim()
    if (!editor || !roomId || busy) return
    setBusy(true)
    try {
      const s = await CollabSession.join(editor, roomId, displayName(), events)
      setSession(s)
      setInRoom(true)
    } catch {
      setHint('Could not join — check the link and retry')
    } finally {
      setBusy(false)
    }
  }

  const displayName = () => {
    const n = name.trim()
    if (n) localStorage.setItem(NAME_KEY, n)
    return n
  }

  const leave = () => {
    getSession()?.leave()
    setSession(null)
    setInRoom(false)
    setPeers([])
    setHint('Left the room')
  }

  const copyLink = async () => {
    if (!session) return
    try {
      await navigator.clipboard.writeText(roomLink(session.roomId))
      setHint('Invite link copied')
    } catch {
      setHint('Copy failed — link is in the address bar hash')
    }
  }

  return (
    <div className="absolute right-3 top-3 z-40 w-64 rounded-xl border border-white/10 bg-[#23262c] p-3 shadow-2xl">
      <div className="mb-2 flex items-center">
        <span className="text-sm font-semibold">Collaborate</span>
        <div className="flex-1" />
        <button
          onClick={() => setCollabOpen(false)}
          className="rounded px-1.5 py-0.5 text-xs text-white/50 hover:bg-white/10"
        >
          ✕
        </button>
      </div>

      {!inRoom ? (
        <>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name (optional)"
            className="mb-2 w-full rounded-md bg-black/40 px-2 py-1.5 text-xs outline-none placeholder:text-white/25 focus:ring-1 focus:ring-white/20"
          />
          <button
            disabled={busy}
            onClick={host}
            className="mb-2 w-full rounded-lg bg-white/90 py-1.5 text-xs font-medium text-black hover:bg-white disabled:opacity-50"
          >
            {busy ? 'Starting…' : 'Host a room'}
          </button>
          <div className="mb-1 text-[11px] uppercase tracking-wide text-white/40">
            …or join with a room id
          </div>
          <div className="flex gap-1.5">
            <input
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder="paste room id"
              className="min-w-0 flex-1 rounded-md bg-black/40 px-2 py-1.5 font-mono text-xs outline-none placeholder:text-white/25 focus:ring-1 focus:ring-white/20"
            />
            <button
              disabled={busy || !roomInput.trim()}
              onClick={join}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20 disabled:opacity-50"
            >
              Join
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-white/40">
            No account, no server to run — rooms connect peer-to-peer. Last-writer-wins on
            conflicts; undo stays local.
          </p>
        </>
      ) : (
        <>
          <button
            onClick={copyLink}
            className="mb-2 w-full rounded-lg bg-white/10 py-1.5 text-xs hover:bg-white/20"
          >
            Copy invite link
          </button>
          <div className="mb-2 space-y-1">
            {peers.map((p) => (
              <div key={p.peerId} className="flex items-center gap-2 text-xs">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                <span className="text-white/85">{p.name}</span>
                {session && p.peerId === session.self.peerId && (
                  <span className="text-white/35">(you{session.isHost ? ', host' : ''})</span>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={leave}
            className="w-full rounded-lg bg-red-500/20 py-1.5 text-xs text-red-200 hover:bg-red-500/30"
          >
            Leave room
          </button>
        </>
      )}
    </div>
  )
}
