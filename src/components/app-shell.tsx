"use client"

import * as React from "react"
import { differenceInCalendarDays, format, isSameDay } from "date-fns"

import { AppSidebar } from "@/components/app-sidebar"
import { DayEvents } from "@/components/day-events"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { ChatPanelProvider } from "@/components/chat-provider"
import { ChatPanel } from "@/components/chat-panel"
import { AppNavbar } from "@/components/app-navbar"
import { getCalendarDayKey } from "@/lib/calendar-day"

type AppShellProps = {
  user: {
    name?: string | null
    email: string
    image?: string | null
  } | null
}

export function AppShell({ user }: AppShellProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date>(() => new Date())
  const [dateMotion, setDateMotion] = React.useState<"left" | "right">("left")
  const selectedDayKey = React.useMemo(
    () => getCalendarDayKey(selectedDate),
    [selectedDate]
  )

  function handleSelectDate(nextDate: Date) {
    if (isSameDay(nextDate, selectedDate)) {
      return
    }

    setDateMotion(nextDate > selectedDate ? "right" : "left")

    setSelectedDate(nextDate)
  }

  const dateContextLabel = React.useMemo(() => {
    const dayOffset = differenceInCalendarDays(selectedDate, new Date())

    switch (dayOffset) {
      case -2:
        return "Day before yesterday"
      case -1:
        return "Yesterday"
      case 0:
        return "Today"
      case 1:
        return "Tomorrow"
      case 2:
        return "Day after tomorrow"
      default:
        return null
    }
  }, [selectedDate])

  return (
    <ChatPanelProvider>
      <AppNavbar user={user} />
      <div className="overflow-hidden">
      <SidebarProvider>
        {user ? (
          <AppSidebar
            user={user}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
          />
        ) : null}
        <SidebarInset id="main-content">
          <div className="flex h-svh flex-col bg-zinc-50 dark:bg-black">
            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-2xl px-6 pt-16">
                {user ? (
                  <div className="flex flex-col gap-8">
                    <div
                      key={selectedDate.toISOString()}
                      className={`animate-in fade-in duration-400 ${
                        dateMotion === "right"
                          ? "slide-in-from-right-6"
                          : "slide-in-from-left-6"
                      }`}
                    >
                      <p
                        className={`mb-2 text-sm font-medium tracking-normal text-zinc-500 dark:text-zinc-400 ${
                          dateContextLabel ? "visible" : "invisible"
                        }`}
                      >
                        {dateContextLabel ?? "Today"}
                      </p>
                      <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                        {format(selectedDate, "EEEE MMMM d, yyyy")}
                      </h1>
                    </div>
                    <DayEvents date={selectedDate} dayKey={selectedDayKey} />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
      </div>

      <ChatPanel dayKey={selectedDayKey} />
    </ChatPanelProvider>
  )
}
