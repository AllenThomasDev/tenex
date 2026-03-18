import { TZDate } from "@date-fns/tz"
import { addDays } from "date-fns"
import { getUserTimeZone } from "@/lib/calendar-timezone"

export function toCalendarDayId(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

export function getDayBounds(date: Date) {
  const tz = getUserTimeZone()
  const [y, m, d] = toCalendarDayId(date).split("-").map(Number)
  const start = new TZDate(y, m - 1, d, tz)
  const end = addDays(start, 1)
  return { timeMin: start.toISOString(), timeMax: end.toISOString() }
}

export function getCalendarDayKey(date: Date) {
  const { timeMin, timeMax } = getDayBounds(date)
  const searchParams = new URLSearchParams({ timeMin, timeMax })
  return `/api/calendar?${searchParams.toString()}`
}
