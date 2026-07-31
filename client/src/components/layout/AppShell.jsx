import { Outlet, useLocation } from 'react-router-dom'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Separator } from '@/components/ui/separator'
import StripeOnboardingBanner from '@/components/stripe/StripeOnboardingBanner'
import { useAuthStore } from '@/store/useAuthStore'

/**
 * AppShell — wraps all authenticated routes with the modern shadcn sidebar-08 layout.
 * Outlet renders the matched child route (page).
 */
export default function AppShell() {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)

  // Generate a page title based on the path
  const getPageTitle = () => {
    const segments = location.pathname.split('/').filter(Boolean)
    if (segments.length <= 1) return 'Dashboard'
    
    // Convert kebab-case or camelCase to human readable title
    const rawTitle = segments[1]
    return rawTitle
      .replace(/-/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background w-full text-foreground">
        <AppSidebar />
        
        <SidebarInset className="bg-background border-l border-border flex-1 flex flex-col">
          {/* Header Bar */}
          <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4 sm:px-6 relative z-10 bg-background/80 backdrop-blur-md">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground hover:bg-card rounded-lg cursor-pointer" />
            <Separator orientation="vertical" className="h-4 bg-muted" />
            <h2 className="text-sm font-semibold tracking-tight text-foreground m-0">
              {getPageTitle()}
            </h2>
          </header>

          {/* Main scrollable content area */}
          <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto w-full">
              <StripeOnboardingBanner />
              <Outlet />
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
