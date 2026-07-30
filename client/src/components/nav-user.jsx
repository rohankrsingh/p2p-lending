"use client"

import { useNavigate } from "react-router-dom"
import { useAuthStore } from "@/store/useAuthStore"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { ChevronsUpDownIcon, LogOutIcon, UserIcon, ShieldIcon, SettingsIcon } from "lucide-react"

export function NavUser() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { isMobile } = useSidebar()

  if (!user) return null

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const initials = user.name ? user.name.slice(0, 2).toUpperCase() : "US"

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }>
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            </div>
            <ChevronsUpDownIcon className="ml-auto size-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56 rounded-lg bg-card border-border text-foreground"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}>
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-muted" />
            <DropdownMenuGroup>
              <DropdownMenuItem className="focus:bg-muted focus:text-foreground cursor-pointer" onClick={() => navigate(`/${user.role}/dashboard`)}>
                <ShieldIcon className="mr-2 size-4 text-primary" />
                Role: <span className="capitalize font-semibold text-primary ml-1">{user.role}</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-muted focus:text-foreground cursor-pointer" onClick={() => navigate(`/${user.role}/settings`)}>
                <SettingsIcon className="mr-2 size-4" />
                Account Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-muted" />
            <DropdownMenuItem
              className="focus:bg-destructive/20 focus:text-destructive text-destructive cursor-pointer"
              onClick={handleLogout}
            >
              <LogOutIcon className="mr-2 size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
