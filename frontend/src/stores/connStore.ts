import { create } from 'zustand'
import type { BgWorkerStatus } from '@/lib/api'
import type { ConnSrc, IframeStatus } from '@/lib/types'

type State = {
  src: ConnSrc
  iframeSt: IframeStatus
  lastSync: Date | null
  lastHash: string | null
  /** Bg-worker status — polled by useDataBridge, consumed by Header. */
  bgSt: BgWorkerStatus | null
  setSrc: (s: ConnSrc) => void
  setIframeSt: (s: IframeStatus) => void
  /** Set lastSync. Default = now; truyền date để sync với BE's last_run timestamp. */
  touchSync: (d?: Date) => void
  setHash: (h: string | null) => void
  setBgSt: (s: BgWorkerStatus | null) => void
}

export const useConnStore = create<State>((set) => ({
  src: 'none',
  iframeSt: 'idle',
  lastSync: null,
  lastHash: null,
  bgSt: null,
  setSrc: (src) => set({ src }),
  setIframeSt: (iframeSt) => set({ iframeSt }),
  touchSync: (d) => set({ lastSync: d ?? new Date() }),
  setHash: (lastHash) => set({ lastHash }),
  setBgSt: (bgSt) => set({ bgSt }),
}))
