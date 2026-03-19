"use client"

import * as React from "react"
import { differenceInCalendarDays, format, isSameDay } from "date-fns"

import { AppSidebar } from "@/components/app-sidebar"
import { DayEvents } from "@/components/day-events"
import { EventSidebarPanel } from "@/components/event-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { ChatPanelProvider, useChatPanel } from "@/components/chat-provider"
import { ChatPanel } from "@/components/chat-panel"
import { AppNavbar } from "@/components/app-navbar"
import { CommandMenu } from "@/components/command-menu"
import { getCalendarDayKey } from "@/lib/calendar-day"
import { useMonthPrefetch } from "@/hooks/use-month-prefetch"
import { cn } from "@/lib/utils"

type AppShellProps = {
  user: {
    name?: string | null
    email: string
    image?: string | null
  } | null
}

export function AppShell({ user }: AppShellProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date>(() => new Date())
  const selectedDayKey = React.useMemo(
    () => getCalendarDayKey(selectedDate),
    [selectedDate]
  )

  return (
    <ChatPanelProvider dayKey={selectedDayKey}>
      <AppShellInner user={user} selectedDate={selectedDate} setSelectedDate={setSelectedDate} selectedDayKey={selectedDayKey} />
    </ChatPanelProvider>
  )
}

function AppShellInner({
  user,
  selectedDate,
  setSelectedDate,
  selectedDayKey,
}: {
  user: AppShellProps["user"]
  selectedDate: Date
  setSelectedDate: React.Dispatch<React.SetStateAction<Date>>
  selectedDayKey: string
}) {
  const { selectedEventIds, toggleEventId } = useChatPanel()
  const [dateMotion, setDateMotion] = React.useState<"left" | "right">("left")
  const [showTopFade, setShowTopFade] = React.useState(false)
  const [showBottomFade, setShowBottomFade] = React.useState(false)
  const mainScrollRef = React.useRef<HTMLDivElement>(null)

  useMonthPrefetch(selectedDate)

  function handleSelectDate(nextDate: Date) {
    if (isSameDay(nextDate, selectedDate)) {
      setSelectedDate(new Date(nextDate))
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

  React.useEffect(() => {
    const container = mainScrollRef.current
    if (!container) return

    const updateScrollCues = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      setShowTopFade(scrollTop > 8)
      setShowBottomFade(scrollTop + clientHeight < scrollHeight - 8)
    }

    updateScrollCues()
    container.addEventListener("scroll", updateScrollCues, { passive: true })
    window.addEventListener("resize", updateScrollCues)

    return () => {
      container.removeEventListener("scroll", updateScrollCues)
      window.removeEventListener("resize", updateScrollCues)
    }
  }, [selectedDate])

  const selectedEventId = selectedEventIds[0] ?? null

  return (
    <>
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
            <div ref={mainScrollRef} className="no-scrollbar relative flex-1 min-w-0 overflow-y-auto">
              <div
                aria-hidden="true"
                className={cn(
                  "pointer-events-none sticky top-0 z-20 -mb-5 h-5 w-full bg-gradient-to-b from-background via-background/85 to-transparent transition-opacity duration-200",
                  showTopFade ? "opacity-100" : "opacity-0"
                )}
              />
              <div className="w-full pb-8">
                {user ? (
                  <div className="flex flex-col gap-8">
                    <div className="sticky top-0 z-10 bg-background/95 px-6 pt-8 pb-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
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
                    </div>
                    <div className="px-6">
                      <DayEvents
                        date={selectedDate}
                        dayKey={selectedDayKey}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
              <div
                aria-hidden="true"
                className={cn(
                  "pointer-events-none sticky bottom-0 z-20 -mt-8 h-8 w-full bg-gradient-to-t from-background via-background/90 to-transparent transition-opacity duration-200",
                  showBottomFade ? "opacity-100" : "opacity-0"
                )}
              />
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
    </>
  )
}
