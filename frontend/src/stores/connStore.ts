import { create } from 'zustand'
import type { ConnSrc, IframeStatus } from '@/lib/types'

type State = {
  src: ConnSrc
  iframeSt: IframeStatus
  lastSync: Date | null
  setSrc: (s: ConnSrc) => void
  setIframeSt: (s: IframeStatus) => void
  touchSync: () => void
}

export const useConnStore = create<State>((set) => ({
  src: 'none',
  iframeSt: 'idle',
  lastSync: null,
  setSrc: (src) => set({ src }),
  setIframeSt: (iframeSt) => set({ iframeSt }),
  touchSync: () => set({ lastSync: new Date() }),
}))
