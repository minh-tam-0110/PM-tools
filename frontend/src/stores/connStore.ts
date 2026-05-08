import { create } from 'zustand'
import type { ConnSrc, IframeStatus } from '@/lib/types'

type State = {
  src: ConnSrc
  iframeSt: IframeStatus
  lastSync: Date | null
  lastHash: string | null
  setSrc: (s: ConnSrc) => void
  setIframeSt: (s: IframeStatus) => void
  touchSync: () => void
  setHash: (h: string | null) => void
}

export const useConnStore = create<State>((set) => ({
  src: 'none',
  iframeSt: 'idle',
  lastSync: null,
  lastHash: null,
  setSrc: (src) => set({ src }),
  setIframeSt: (iframeSt) => set({ iframeSt }),
  touchSync: () => set({ lastSync: new Date() }),
  setHash: (lastHash) => set({ lastHash }),
}))
