"use client"

import * as React from "react"
import { differenceInCalendarDays, format, isSameDay } from "date-fns"

import { AppSidebar } from "@/components/app-sidebar"
import { DayEvents } from "@/components/day-events"
import { EventSidebarPanel } from "@/components/event-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { ChatPanelProvider } from "@/components/chat-provider"
import { ChatPanel } from "@/components/chat-panel"
import { AppNavbar } from "@/components/app-navbar"
import { CommandMenu } from "@/components/command-menu"
import { getCalendarDayKey } from "@/lib/calendar-day"
import { useMonthPrefetch } from "@/hooks/use-month-prefetch"

type AppShellProps = {
  user: {
    name?: string | null
    email: string
    image?: string | null
  } | null
}

export function AppShell({ user }: AppShellProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date>(() => new Date())
  const [selectedEventId, setSelectedEventId] = React.useState<string | null>(null)
  const [dateMotion, setDateMotion] = React.useState<"left" | "right">("left")
  const selectedDayKey = React.useMemo(
    () => getCalendarDayKey(selectedDate),
    [selectedDate]
  )

  useMonthPrefetch(selectedDate)

  function handleSelectDate(nextDate: Date) {
    if (isSameDay(nextDate, selectedDate)) {
      return
    }

    setDateMotion(nextDate > selectedDate ? "right" : "left")
    setSelectedEventId(null)

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
      <div className="flex h-svh flex-col pt-10 overflow-hidden">
      <SidebarProvider className="flex-1 min-h-0">
        {user ? (
          <AppSidebar
            user={user}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
          />
        ) : null}
        <SidebarInset id="main-content">
          <div className="flex h-full flex-row bg-background">
            {/* Main events column */}
            <div className="flex-1 min-w-0 overflow-y-auto">
              <div className="mx-auto w-full max-w-2xl px-6 pt-8">
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
                        className={`mb-2 text-sm font-medium tracking-normal text-muted-foreground ${
                          dateContextLabel ? "visible" : "invisible"
                        }`}
                      >
                        {dateContextLabel ?? "Today"}
                      </p>
                      <h1 className="text-4xl font-bold tracking-tight text-foreground">
                        {format(selectedDate, "EEEE MMMM d, yyyy")}
                      </h1>
                    </div>
                    <DayEvents
                      date={selectedDate}
                      dayKey={selectedDayKey}
                      selectedEventId={selectedEventId}
                      onSelectEvent={setSelectedEventId}
                    />
                  </div>
                ) : null}
              </div>
            </div>
            {/* Right column — same width/position as ChatPanel so it sits beneath it */}
            <div className="hidden lg:flex lg:flex-col w-[380px] shrink-0 border-l border-border">
              {user ? (
                <EventSidebarPanel
                  dayKey={selectedDayKey}
                  selectedEventId={selectedEventId}
                />
              ) : null}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
      </div>


      <CommandMenu onSelectDate={handleSelectDate} />
      <ChatPanel dayKey={selectedDayKey} />
    </ChatPanelProvider>
  )
}
