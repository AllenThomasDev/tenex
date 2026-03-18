import { getUserTimeZone } from "@/lib/calendar-timezone"

export function toCalendarDayId(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

export function getCalendarDayKey(date: Date) {
  const searchParams = new URLSearchParams({
    date: toCalendarDayId(date),
    timeZone: getUserTimeZone(),
  })

  return `/api/calendar?${searchParams.toString()}`
}
