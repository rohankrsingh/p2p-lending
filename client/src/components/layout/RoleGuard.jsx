import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import AppShell from './AppShell'

/**
 * Wraps routes that require a specific role.
 * - Not logged in → redirect to /login
 * - Wrong role    → redirect to their own dashboard
 * - Correct role  → render inside AppShell (sidebar layout)
 */
export default function RoleGuard({ role }) {
  const user = useAuthStore((s) => s.user)

  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to={`/${user.role}/dashboard`} replace />

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
