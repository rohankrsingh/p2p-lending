import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FilePlus,
  FolderOpen,
  CreditCard,
  Store,
  TrendingUp,
  Wallet,
  Settings,
  LogOut,
  Landmark,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'

const borrowerNav = [
  { label: 'Dashboard',      href: '/borrower/dashboard',    icon: LayoutDashboard },
  { label: 'Apply for Loan', href: '/borrower/create-loan',  icon: FilePlus },
  { label: 'My Loans',       href: '/borrower/my-loans',     icon: FolderOpen },
  { label: 'Repayments',     href: '/borrower/repayments',   icon: CreditCard },
]

const lenderNav = [
  { label: 'Dashboard',      href: '/lender/dashboard',     icon: LayoutDashboard },
  { label: 'Marketplace',    href: '/lender/marketplace',   icon: Store },
  { label: 'My Investments', href: '/lender/investments',   icon: TrendingUp },
  { label: 'Payouts',        href: '/lender/payouts',       icon: Wallet },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const navItems = user?.role === 'borrower' ? borrowerNav : lenderNav

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen border-r bg-sidebar text-sidebar-foreground shrink-0">
      {/* ── Brand ── */}
      <div className="flex items-center gap-2 px-6 py-5 border-b">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
          <Landmark className="w-4 h-4" />
        </div>
        <span className="font-semibold text-lg tracking-tight">P2P Lend</span>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ label, href, icon: Icon }) => (
          <NavLink
            key={href}
            to={href}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}

        <Separator className="my-3 opacity-50" />

        <NavLink
          to={`/${user?.role}/settings`}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
            )
          }
        >
          <Settings className="w-4 h-4 shrink-0" />
          Settings
        </NavLink>
      </nav>

      {/* ── User footer ── */}
      <div className="px-4 py-4 border-t">
        <div className="flex items-center gap-3 mb-3">
          {/* Avatar initials */}
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/15 text-primary font-semibold text-sm shrink-0">
            {user?.name?.slice(0, 2).toUpperCase() || '??'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            className={cn(
              'text-xs capitalize',
              user?.role === 'borrower'
                ? 'border-blue-500/40 text-blue-500'
                : 'border-emerald-500/40 text-emerald-500'
            )}
          >
            {user?.role}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  )
}
