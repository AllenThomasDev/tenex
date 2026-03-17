"use client"

import * as React from "react"

import { DatePicker } from "@/components/date-picker"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: {
    name?: string | null
    email: string
    image?: string | null
  }
  selectedDate?: Date
  onSelectDate?: (date: Date | undefined) => void
}

export function AppSidebar({
  user,
  selectedDate,
  onSelectDate = () => {},
  ...props
}: AppSidebarProps) {
  return (
    <Sidebar {...props}>
      <SidebarHeader />
      <SidebarContent>
        <DatePicker date={selectedDate} onSelect={onSelectDate} />
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <NavUser
          user={{
            name: user.name,
            email: user.email,
            avatar: user.image,
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
