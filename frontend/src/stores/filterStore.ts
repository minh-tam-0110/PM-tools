import { create } from 'zustand'
import type { Filters } from '@/lib/types'
import { EMPTY_FILTERS } from '@/lib/filter'

type State = {
  filters: Filters
  search: string
  set: (patch: Partial<Filters>) => void
  setSearch: (s: string) => void
  clear: () => void
}

export const useFilterStore = create<State>((set) => ({
  filters: EMPTY_FILTERS,
  search: '',
  set: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  setSearch: (search) => set({ search }),
  clear: () => set({ filters: EMPTY_FILTERS, search: '' }),
}))
