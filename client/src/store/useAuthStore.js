import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,      // { id, name, email, role, stripeVerified }
      token: null,

      setUser: (user, token) => set({ user, token }),

      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),

      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'p2p-auth', // key in localStorage
    }
  )
)
