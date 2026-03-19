import { TZDate } from "@date-fns/tz"
import { addDays } from "date-fns"
import { getUserTimeZone } from "@/lib/calendar-timezone"

type CalendarEventBoundary = {
  date?: string | null
  dateTime?: string | null
  timeZone?: string | null
}

type CalendarEventTiming = {
  start?: CalendarEventBoundary | null
  end?: CalendarEventBoundary | null
}

export function toCalendarDayId(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function getLocalDateKey(date: Date, timeZone: string) {
  return date.toLocaleDateString("en-CA", { timeZone })
}

function parseDateKey(dateKey: string) {
  return dateKey.split("-").map(Number) as [number, number, number]
}

function buildDayKeyFromDateKey(dateKey: string, timeZone: string) {
  const [year, month, day] = parseDateKey(dateKey)
  return getCalendarDayKey(new TZDate(year, month - 1, day, timeZone), timeZone)
}

function getDateKeysInRange(startDateKey: string, endDateKey: string) {
  const [startYear, startMonth, startDay] = parseDateKey(startDateKey)
  const [endYear, endMonth, endDay] = parseDateKey(endDateKey)
  const keys: string[] = []

  let cursor = new Date(Date.UTC(startYear, startMonth - 1, startDay))
  const end = new Date(Date.UTC(endYear, endMonth - 1, endDay))

  while (cursor <= end) {
    keys.push(
      `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}-${String(cursor.getUTCDate()).padStart(2, "0")}`,
    )
    cursor = new Date(cursor.getTime() + 86_400_000)
  }

  return keys
}

export function getDayBounds(date: Date, timeZone = getUserTimeZone()) {
  const tz = timeZone
  const [y, m, d] = toCalendarDayId(date).split("-").map(Number)
  const start = new TZDate(y, m - 1, d, tz)
  const end = addDays(start, 1)
  return { timeMin: start.toISOString(), timeMax: end.toISOString() }
}

export function getCalendarDayKey(date: Date, timeZone = getUserTimeZone()) {
  const { timeMin, timeMax } = getDayBounds(date, timeZone)
  const searchParams = new URLSearchParams({ timeMin, timeMax })
  return `/api/calendar?${searchParams.toString()}`
}

export function getAffectedDayKeysForEvent(
  event: CalendarEventTiming,
  userTimeZone: string,
) {
  const start = event.start
  const end = event.end

  if (!start || !end) return []

  if (start.date && end.date) {
    const [endYear, endMonth, endDay] = parseDateKey(end.date)
    const exclusiveEnd = new Date(Date.UTC(endYear, endMonth - 1, endDay) - 1)
    const inclusiveEndKey = `${exclusiveEnd.getUTCFullYear()}-${String(exclusiveEnd.getUTCMonth() + 1).padStart(2, "0")}-${String(exclusiveEnd.getUTCDate()).padStart(2, "0")}`

    return getDateKeysInRange(start.date, inclusiveEndKey).map((dateKey) =>
      buildDayKeyFromDateKey(dateKey, userTimeZone),
    )
  }

  if (!start.dateTime) return []

  const startAt = new Date(start.dateTime)
  const endAt = new Date(end.dateTime ?? start.dateTime)

  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return []
  }

  const inclusiveEnd = new Date(Math.max(startAt.getTime(), endAt.getTime() - 1))
  const startDateKey = getLocalDateKey(startAt, userTimeZone)
  const endDateKey = getLocalDateKey(inclusiveEnd, userTimeZone)

  return getDateKeysInRange(startDateKey, endDateKey).map((dateKey) =>
    buildDayKeyFromDateKey(dateKey, userTimeZone),
  )
}
