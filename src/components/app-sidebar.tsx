"use client"

import * as React from "react"

import { DatePicker } from "@/components/date-picker"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: {
    name?: string | null
    email: string
    image?: string | null
  }
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  return (
    <Sidebar {...props}>
      <SidebarHeader className="h-16 border-b border-sidebar-border">
        <NavUser
          user={{
            name: user.name,
            email: user.email,
            avatar: user.image,
          }}
        />
      </SidebarHeader>
      <SidebarContent>
        <DatePicker />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
