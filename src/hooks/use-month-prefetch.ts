"use client"

import { useEffect } from "react"
import { useSWRConfig } from "swr"

import { getUserTimeZone } from "@/lib/calendar-timezone"

type DayEvent = {
  id?: string
  title: string
  start?: string
  end?: string
  isAllDay: boolean
  location?: string
  attendeesCount: number
}

type CalendarMonthResponse = {
  days: Record<string, DayEvent[]>
}

export function useMonthPrefetch(selectedDate: Date) {
  const { cache, mutate } = useSWRConfig()

  const year = selectedDate.getFullYear()
  const month = selectedDate.getMonth() + 1
  const monthKey = `${year}-${String(month).padStart(2, "0")}`
  const timeZone = getUserTimeZone()

  useEffect(() => {
    const controller = new AbortController()

    fetch(`/api/calendar/month?year=${year}&month=${month}&timeZone=${encodeURIComponent(timeZone)}`, {
      signal: controller.signal,
    })
      .then(res => res.ok ? res.json() : null)
      .then((data: CalendarMonthResponse | null) => {
        if (!data) return
        for (const [dateStr, events] of Object.entries(data.days)) {
          const swrKey = `/api/calendar?date=${dateStr}&timeZone=${encodeURIComponent(timeZone)}`
          if (!cache.get(swrKey)?.data) {
            mutate(swrKey, events, { revalidate: false })
          }
        }
      })
      .catch(() => {})

    return () => controller.abort()
  }, [cache, month, monthKey, mutate, timeZone, year])
}
