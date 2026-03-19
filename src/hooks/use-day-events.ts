import * as React from "react"
import { isPast, isToday, parseISO, startOfDay } from "date-fns"
import useSWR from "swr"

import { getCalendarDayKey } from "@/lib/calendar-day"
import { CALENDAR_DAY_SWR_OPTIONS } from "@/lib/calendar-swr"

export type DayEvent = {
  id?: string
  title: string
  start?: string
  end?: string
  isAllDay: boolean
  location?: string
  attendeesCount: number
  attendees?: { email?: string; displayName?: string; responseStatus?: string; self?: boolean; optional?: boolean }[]
  status?: string
  htmlLink?: string
  description?: string
  hangoutLink?: string
  conferenceLink?: string
  organizer?: { email?: string; displayName?: string; self?: boolean }
  selfResponseStatus?: string
  colorId?: string
  color?: { background: string; foreground: string }
  recurringEventId?: string
  visibility?: string
}

export type EventTimingState = "past" | "current" | "upcoming" | null

export type TimedDayEvent = {
  event: DayEvent
  timingState: EventTimingState
}

type CalendarResponse = {
  events: DayEvent[]
}

function getEventTimingState(event: DayEvent, now: Date, shouldCompare: boolean): EventTimingState {
  if (!shouldCompare || event.isAllDay || !event.start || !event.end) {
    return null
  }

  const start = parseISO(event.start)
  const end = parseISO(event.end)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null
  }

  if (now > end) {
    return "past"
  }

  if (now >= start && now <= end) {
    return "current"
  }

  return "upcoming"
}

export async function fetchDayEvents(url: string): Promise<DayEvent[]> {
  const response = await fetch(url, { cache: "no-store" })

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      error?: string
    } | null

    throw new Error(data?.error ?? "Could not load calendar events.")
  }

  const data = (await response.json()) as CalendarResponse

  return data.events
}

export function useDayEvents(date: Date, dayKey?: string) {
  const swrKey = React.useMemo(() => dayKey ?? getCalendarDayKey(date), [date, dayKey])
  const { data: events, error, isLoading, mutate } = useSWR<DayEvent[]>(
    swrKey,
    fetchDayEvents,
    CALENDAR_DAY_SWR_OPTIONS,
  )
  const [now, setNow] = React.useState(() => new Date())
  const isViewingToday = isToday(date)
  const isViewingPastDay = !isViewingToday && isPast(startOfDay(date))
  const shouldShowTiming = isViewingToday || isViewingPastDay

  const timedEvents = React.useMemo<TimedDayEvent[]>(() => {
    if (!events) return []

    return events.map((event) => ({
      event,
      timingState: getEventTimingState(event, now, shouldShowTiming),
    }))
  }, [events, now, shouldShowTiming])

  const orderedEvents = React.useMemo(() => {
    if (!shouldShowTiming) return timedEvents

    const upcomingOrCurrent: TimedDayEvent[] = []
    const past: TimedDayEvent[] = []

    for (const timedEvent of timedEvents) {
      const { timingState } = timedEvent
      if (timingState === "past") {
        past.push(timedEvent)
      } else {
        upcomingOrCurrent.push(timedEvent)
      }
    }

    return [...upcomingOrCurrent, ...past]
  }, [shouldShowTiming, timedEvents])

  const eventSummary = React.useMemo(() => {
    if (timedEvents.length === 0) {
      return { total: 0, past: 0, current: 0, upcoming: 0 }
    }

    let pastCount = 0
    let currentCount = 0
    let upcomingCount = 0

    for (const { timingState } of timedEvents) {
      if (timingState === "past") {
        pastCount += 1
      } else if (timingState === "current") {
        currentCount += 1
      } else {
        upcomingCount += 1
      }
    }

    return {
      total: timedEvents.length,
      past: pastCount,
      current: currentCount,
      upcoming: upcomingCount,
    }
  }, [timedEvents])

  React.useEffect(() => {
    if (!isViewingToday) return

    const intervalId = window.setInterval(() => {
      setNow(new Date())
    }, 60_000)

    setNow(new Date())

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isViewingToday, date])

  return {
    events,
    orderedEvents,
    eventSummary,
    error,
    isLoading,
    mutate,
    isViewingToday,
    isViewingPastDay,
  }
}
