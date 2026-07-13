import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'

/**
 * Wraps routes that require a specific role.
 * - Not logged in → redirect to /login
 * - Wrong role → redirect to their own dashboard (403-like)
 */
export default function RoleGuard({ role }) {
  const user = useAuthStore((s) => s.user)

  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to={`/${user.role}/dashboard`} replace />

  return <Outlet />
}
