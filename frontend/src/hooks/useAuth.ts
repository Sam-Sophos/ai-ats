import { useAuthStore } from '../store/authStore'

export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const logout = useAuthStore((s) => s.logout)

  const roleTitle = user?.role?.title ?? null
  const canManage = roleTitle === 'ADMIN' || roleTitle === 'HR_MANAGER'

  return { user, isAuthenticated, logout, roleTitle, canManage }
}