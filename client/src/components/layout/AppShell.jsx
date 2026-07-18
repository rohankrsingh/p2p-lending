import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

/**
 * AppShell — wraps all authenticated routes with the sidebar layout.
 * Outlet renders the matched child route (page).
 */
export default function AppShell() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      {/* Main content area */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
