"use client"

import * as React from "react"
import { differenceInCalendarDays, format } from "date-fns"

import { AppSidebar } from "@/components/app-sidebar"
import { DayEvents } from "@/components/day-events"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Chat } from "@/app/chat"
import { getCalendarDayKey } from "@/lib/calendar-day"

type AppShellProps = {
  user: {
    name?: string | null
    email: string
    image?: string | null
  } | null
}

export function AppShell({ user }: AppShellProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    () => new Date()
  )
  const [dateMotion, setDateMotion] = React.useState<"left" | "right">("left")
  const selectedDayKey = React.useMemo(
    () => (selectedDate ? getCalendarDayKey(selectedDate) : null),
    [selectedDate]
  )

  function handleSelectDate(date: Date | undefined) {
    const nextDate = date ?? new Date()

    if (selectedDate) {
      setDateMotion(nextDate > selectedDate ? "right" : "left")
    }

    setSelectedDate(nextDate)
  }

  const dateContextLabel = React.useMemo(() => {
    if (!selectedDate) {
      return null
    }

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
    <SidebarProvider>
      {user ? (
        <AppSidebar
          user={user}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
        />
      ) : null}
      <SidebarInset>
        <div className="flex min-h-screen bg-zinc-50 dark:bg-black">
          <main className="flex w-full justify-center px-6 py-10">
            {user ? (
              <div className="flex w-full max-w-4xl flex-col gap-8">
                {selectedDate ? (
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
                ) : null}
                {selectedDate ? <DayEvents date={selectedDate} dayKey={selectedDayKey ?? undefined} /> : null}
                <Chat dayKey={selectedDayKey} />
              </div>
            ) : null}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
