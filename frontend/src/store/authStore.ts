import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, LoginCredentials } from '../types'
import axiosInstance from '../api/axiosInstance'
interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean

  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (credentials: LoginCredentials) => {
        const { data } = await axiosInstance.post('/auth/login/', credentials)
        set({
          user: data.user,
          accessToken: data.access,
          refreshToken: data.refresh,
          isAuthenticated: true,
        })
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        })
      },

      setUser: (user: User) => set({ user }),
    }),
    {
      name: 'auth-storage',
      // Only persist these fields — not the functions
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
