"use client"

import { useEffect } from "react"
import { TZDate } from "@date-fns/tz"
import { addMonths } from "date-fns"
import { useSWRConfig } from "swr"

import { getUserTimeZone } from "@/lib/calendar-timezone"
import { getCalendarDayKey } from "@/lib/calendar-day"

type CalendarEvent = {
  id?: string
  title: string
  start?: string
  end?: string
  isAllDay: boolean
  [key: string]: unknown
}

function getLocalDateKey(date: Date, timeZone: string) {
  return date.toLocaleDateString("en-CA", { timeZone })
}

function bucketEventsByDay(events: CalendarEvent[], timeZone: string) {
  const days: Record<string, CalendarEvent[]> = {}

  function addToDay(key: string, event: CalendarEvent) {
    ;(days[key] ??= []).push(event)
  }

  for (const event of events) {
    if (event.isAllDay) {
      const startStr = event.start
      const endStr = event.end
      if (!startStr || !endStr) continue

      const [sy, sm, sd] = startStr.split("-").map(Number)
      const [ey, em, ed] = endStr.split("-").map(Number)

      let cur = new Date(Date.UTC(sy, sm - 1, sd))
      const endDay = new Date(Date.UTC(ey, em - 1, ed))

      while (cur < endDay) {
        const key = `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, "0")}-${String(cur.getUTCDate()).padStart(2, "0")}`
        addToDay(key, event)
        cur = new Date(cur.getTime() + 86_400_000)
      }
    } else {
      if (!event.start) continue

      const startKey = getLocalDateKey(new Date(event.start), timeZone)
      const endKey = getLocalDateKey(
        new Date(new Date(event.end ?? event.start).getTime() - 1),
        timeZone,
      )

      let cur = new Date(`${startKey}T00:00:00.000Z`)
      const endDay = new Date(`${endKey}T00:00:00.000Z`)

      while (cur <= endDay) {
        const key = `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, "0")}-${String(cur.getUTCDate()).padStart(2, "0")}`
        addToDay(key, event)
        cur = new Date(cur.getTime() + 86_400_000)
      }
    }
  }

  return days
}

export function useMonthPrefetch(selectedDate: Date) {
  const { cache, mutate } = useSWRConfig()

  const year = selectedDate.getFullYear()
  const month = selectedDate.getMonth() + 1
  const monthKey = `${year}-${String(month).padStart(2, "0")}`
  const timeZone = getUserTimeZone()

  useEffect(() => {
    const controller = new AbortController()

    const start = new TZDate(year, month - 1, 1, timeZone)
    const end = addMonths(start, 1)
    const params = new URLSearchParams({
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
    })

    fetch(`/api/calendar?${params}`, { signal: controller.signal })
      .then(res => res.ok ? res.json() : null)
      .then((data: { events: CalendarEvent[] } | null) => {
        if (!data) return

        const days = bucketEventsByDay(data.events, timeZone)

        for (const [dateStr, events] of Object.entries(days)) {
          const [y, m, d] = dateStr.split("-").map(Number)
          const dayDate = new Date(y, m - 1, d)
          const swrKey = getCalendarDayKey(dayDate)
          if (!cache.get(swrKey)?.data) {
            mutate(swrKey, events, { revalidate: false })
          }
        }
      })
      .catch(() => {})

    return () => controller.abort()
  }, [cache, month, monthKey, mutate, timeZone, year])
}
