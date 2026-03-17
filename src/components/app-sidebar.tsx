"use client"

import * as React from "react"

import { DatePicker } from "@/components/date-picker"
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
  selectedDate: Date
  onSelectDate?: (date: Date) => void
}

export function AppSidebar({
  user,
  selectedDate,
  onSelectDate = () => {},
  ...props
}: AppSidebarProps) {
  return (
    <Sidebar {...props}>
      <SidebarHeader className="h-10 border-b border-sidebar-border" />
      <SidebarContent>
        <DatePicker date={selectedDate} onSelect={onSelectDate} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
