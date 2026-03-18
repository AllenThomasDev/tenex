import { TZDate, tz } from "@date-fns/tz"
import { addDays, addMonths, format } from "date-fns"

export function getUserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export function getLocalDateKey(date: Date, timeZone: string) {
  return format(date, "yyyy-MM-dd", { in: tz(timeZone) })
}

export function getUtcBoundsForLocalDate(date: string, timeZone: string) {
  const [year, month, day] = date.split("-").map(Number)
  const startUtc = new TZDate(year, month - 1, day, timeZone)

  return {
    startUtc,
    endUtc: addDays(startUtc, 1),
  }
}

export function getUtcBoundsForLocalMonth(year: number, month: number, timeZone: string) {
  const startUtc = new TZDate(year, month - 1, 1, timeZone)

  return {
    startUtc,
    endUtc: addMonths(startUtc, 1),
  }
}
