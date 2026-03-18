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
  const [month, setMonth] = React.useState(date)
  const [prevDate, setPrevDate] = React.useState(date)

  if (date !== prevDate) {
    setPrevDate(date)
    setMonth(date)
  }

  return (
    <SidebarGroup className="px-0">
      <SidebarGroupContent>
        <Calendar
          mode="single"
          required
          selected={date}
          onSelect={onSelect}
          month={month}
          onMonthChange={setMonth}
          captionLayout="dropdown"
          className="bg-transparent [--cell-size:2.1rem]"
        />
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
