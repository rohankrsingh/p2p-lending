"use client"

import * as React from "react"
import { useAuthStore } from "@/store/useAuthStore"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  FilePlus,
  FolderOpen,
  CreditCard,
  Store,
  TrendingUp,
  Wallet,
  Settings,
  Landmark,
} from "lucide-react"

export function AppSidebar({ ...props }) {
  const { user } = useAuthStore()

  const navItems = React.useMemo(() => {
    if (!user) return []

    if (user.role === "borrower") {
      return [
        {
          title: "Dashboard",
          url: "/borrower/dashboard",
          icon: LayoutDashboard,
        },
        {
          title: "Apply for Loan",
          url: "/borrower/create-loan",
          icon: FilePlus,
        },
        {
          title: "My Loans",
          url: "/borrower/my-loans",
          icon: FolderOpen,
        },
        {
          title: "Repayments",
          url: "/borrower/repayments",
          icon: CreditCard,
        },
        {
          title: "Settings",
          url: "/borrower/settings",
          icon: Settings,
        },
      ]
    } else {
      return [
        {
          title: "Dashboard",
          url: "/lender/dashboard",
          icon: LayoutDashboard,
        },
        {
          title: "Marketplace",
          url: "/lender/marketplace",
          icon: Store,
        },
        {
          title: "My Investments",
          url: "/lender/investments",
          icon: TrendingUp,
        },
        {
          title: "Payouts",
          url: "/lender/payouts",
          icon: Wallet,
        },
        {
          title: "Settings",
          url: "/lender/settings",
          icon: Settings,
        },
      ]
    }
  }, [user])

  return (
    <Sidebar variant="inset" className="border-border bg-sidebar text-sidebar-foreground" {...props}>
      <SidebarHeader className="border-b border-border/60 py-4 px-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-muted/40">
              <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-cta">
                <Landmark className="size-5" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight ml-2">
                <span className="font-bold text-foreground tracking-tight">P2P Lend</span>
                <span className="text-[10px] text-primary font-semibold tracking-wide uppercase">
                  {user?.role === "borrower" ? "Borrower Portal" : "Investor Portal"}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent className="px-2 py-4">
        <NavMain items={navItems} />
      </SidebarContent>

      <SidebarFooter className="border-t border-border/60 p-3">
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
