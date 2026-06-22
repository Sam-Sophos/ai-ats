import { useCandidateAuthStore } from '../store/candidateAuthStore'

export function useCandidateAuth() {
  const candidate = useCandidateAuthStore((s) => s.candidate)
  const isAuthenticated = useCandidateAuthStore((s) => s.isAuthenticated)
  const logout = useCandidateAuthStore((s) => s.logout)

  return { candidate, isAuthenticated, logout }
}