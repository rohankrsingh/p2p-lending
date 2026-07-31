import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Theme store — applies a design direction (`data-theme`) plus light/dark
 * mode on <html>. Persisted so the choice survives reloads.
 *
 * Directions: 'ledger' (default) | 'clearwater' | 'forge'
 */
const STORAGE_KEY = 'p2p-theme'
const DEFAULTS = { direction: 'ledger', mode: 'dark' }

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return null
}

// Apply saved theme before React mounts — avoids a flash of the wrong theme.
;(function applyInitial() {
  const stored = readStored()
  const direction = stored?.direction || DEFAULTS.direction
  const mode = stored?.mode || DEFAULTS.mode
  const root = document.documentElement
  root.dataset.theme = direction
  root.classList.toggle('dark', mode === 'dark')
})()

export const useThemeStore = create(
  persist(
    (set, get) => ({
      direction: readStored()?.direction || DEFAULTS.direction,
      mode: readStored()?.mode || DEFAULTS.mode,

      setDirection: (direction) => {
        document.documentElement.dataset.theme = direction
        set({ direction })
      },

      setMode: (mode) => {
        document.documentElement.classList.toggle('dark', mode === 'dark')
        set({ mode })
      },

      toggleMode: () => {
        const next = get().mode === 'dark' ? 'light' : 'dark'
        get().setMode(next)
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (s) => ({ direction: s.direction, mode: s.mode }),
    }
  )
)
