import { create } from 'zustand'
import type { Presence } from '../collab/protocol'
import type { SaveStatus } from './types'

interface BoardUiState {
  shapeCount: number
  saveStatus: SaveStatus
  hint: string
  selectedIds: string[]
  selectionRev: number
  searchOpen: boolean
  collabOpen: boolean
  peers: Presence[]
  setShapeCount: (n: number) => void
  setSaveStatus: (s: SaveStatus) => void
  setHint: (h: string) => void
  setSelectedIds: (ids: string[]) => void
  setSearchOpen: (open: boolean) => void
  setCollabOpen: (open: boolean) => void
  setPeers: (peers: Presence[]) => void
}

/** Lightweight UI state. The canvas itself is owned by tldraw's store. */
export const useBoardUi = create<BoardUiState>((set) => ({
  shapeCount: 0,
  saveStatus: 'loading',
  hint: 'Paste, drop, or drag anything onto the canvas',
  selectedIds: [],
  selectionRev: 0,
  searchOpen: false,
  collabOpen: false,
  peers: [],
  setShapeCount: (shapeCount) => set({ shapeCount }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setHint: (hint) => set({ hint }),
  setSelectedIds: (selectedIds) =>
    set((s) => ({ selectedIds, selectionRev: s.selectionRev + 1 })),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setCollabOpen: (collabOpen) => set({ collabOpen }),
  setPeers: (peers) => set({ peers }),
}))
