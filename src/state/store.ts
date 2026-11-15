import { create } from 'zustand'

export interface Insets {
  top: number
  right: number
  bottom: number
}

export type CameraCommand =
  | { type: 'reset' }
  | { type: 'zoom'; factor: number }
  | { type: 'focus'; id: string }

interface MapState {
  selectedId: string | null
  hoveredId: string | null
  ready: boolean
  listOpen: boolean
  /** porzione di schermo coperta da intestazione e pannelli, in px */
  insets: Insets
  command: (CameraCommand & { n: number }) | null
  select: (id: string | null) => void
  hover: (id: string | null) => void
  setReady: () => void
  setListOpen: (open: boolean) => void
  setInsets: (i: Insets) => void
  send: (c: CameraCommand) => void
}

let counter = 0

export const useMap = create<MapState>((set, get) => ({
  selectedId: null,
  hoveredId: null,
  ready: false,
  listOpen: false,
  insets: { top: 84, right: 0, bottom: 0 },
  command: null,
  select: (id) => {
    set({ selectedId: id, listOpen: false })
    if (id) get().send({ type: 'focus', id })
  },
  hover: (id) => set({ hoveredId: id }),
  setReady: () => set({ ready: true }),
  setListOpen: (listOpen) => set({ listOpen }),
  setInsets: (insets) => {
    const c = get().insets
    if (c.top !== insets.top || c.right !== insets.right || c.bottom !== insets.bottom) set({ insets })
  },
  send: (c) => set({ command: { ...c, n: ++counter } }),
}))


// accesso di comodo per test automatici e debug dalla console (solo in sviluppo)
if (import.meta.env.DEV) {
  const g = globalThis as unknown as Record<string, unknown>
  g.__select = (id: string | null) => useMap.getState().select(id)
  g.__send = (c: CameraCommand) => useMap.getState().send(c)
  g.__state = () => useMap.getState()
}
