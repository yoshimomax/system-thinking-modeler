import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiState {
  trackpadMode: boolean
  setTrackpadMode: (v: boolean) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      trackpadMode: false,
      setTrackpadMode: (v) => set({ trackpadMode: v }),
    }),
    { name: 'cld-ui-prefs' }
  )
)
