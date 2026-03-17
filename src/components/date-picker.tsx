import * as React from "react"

import { Calendar } from "@/components/ui/calendar"
import {
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar"

type DatePickerProps = {
  date: Date
  onSelect: (date: Date) => void
}

export function DatePicker({ date, onSelect }: DatePickerProps) {
  return (
    <SidebarGroup className="px-0">
      <SidebarGroupContent>
        <Calendar
          mode="single"
          required
          selected={date}
          onSelect={onSelect}
          captionLayout="dropdown"
          className="bg-transparent [--cell-size:2.1rem]"
        />
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
