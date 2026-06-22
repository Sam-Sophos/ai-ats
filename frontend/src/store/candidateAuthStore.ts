import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Candidate, CandidateLoginPayload, CandidateRegisterPayload } from '../types'
import candidateAxiosInstance from '../api/candidateAxiosInstance'

interface CandidateAuthState {
  candidate: Candidate | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean

  login: (credentials: CandidateLoginPayload) => Promise<void>
  register: (data: CandidateRegisterPayload) => Promise<void>
  logout: () => void
}

export const useCandidateAuthStore = create<CandidateAuthState>()(
  persist(
    (set) => ({
      candidate: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (credentials) => {
        const { data } = await candidateAxiosInstance.post('/candidate-auth/login/', credentials)
        set({
          candidate: data.candidate,
          accessToken: data.access,
          refreshToken: data.refresh,
          isAuthenticated: true,
        })
      },

      register: async (payload) => {
        const { data } = await candidateAxiosInstance.post('/candidate-auth/register/', payload)
        set({
          candidate: data.candidate,
          accessToken: data.access,
          refreshToken: data.refresh,
          isAuthenticated: true,
        })
      },

      logout: () => {
        set({
          candidate: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        })
      },
    }),
    {
      name: 'candidate-auth-storage',
      partialize: (state) => ({
        candidate: state.candidate,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)