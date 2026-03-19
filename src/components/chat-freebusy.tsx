"use client"

import {
  format,
  parseISO,
  differenceInMinutes,
  differenceInCalendarDays,
  addDays,
  startOfDay,
  endOfDay,
  max as dateMax,
  min as dateMin,
} from "date-fns"
import { Clock } from "lucide-react"

type BusySlot = { start: string; end: string }

export type FreeBusyData = {
  timeMin: string
  timeMax: string
  timeZone?: string
  busy: BusySlot[]
}

function DayTimeline({
  date,
  busy,
  dayStart,
  dayEnd,
}: {
  date: Date
  busy: BusySlot[]
  dayStart: number
  dayEnd: number
}) {
  const totalMinutes = (dayEnd - dayStart) * 60
  const hours = Array.from({ length: dayEnd - dayStart + 1 }, (_, i) => dayStart + i)

  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground px-1">
        {format(date, "EEEE, MMM d")}
      </p>
      <div className="relative rounded-lg border border-border/50 bg-background/50 overflow-hidden">
        {/* Hour grid lines */}
        <div className="flex">
          {hours.map((h) => (
            <div
              key={h}
              className="flex-1 border-r border-border/30 last:border-r-0"
              style={{ minHeight: 28 }}
            />
          ))}
        </div>

        {/* Busy blocks overlay */}
        <div className="absolute inset-0">
          {busy.map((slot, i) => {
            const slotStart = parseISO(slot.start)
            const slotEnd = parseISO(slot.end)
            const clampedStart = dateMax([slotStart, startOfDay(date)])
            const clampedEnd = dateMin([slotEnd, endOfDay(date)])

            const startMin = clampedStart.getHours() * 60 + clampedStart.getMinutes() - dayStart * 60
            const endMin = clampedEnd.getHours() * 60 + clampedEnd.getMinutes() - dayStart * 60

            const left = Math.max(0, (startMin / totalMinutes) * 100)
            const width = Math.max(0.5, ((endMin - startMin) / totalMinutes) * 100)

            return (
              <div
                key={i}
                className="absolute top-0 bottom-0 rounded-sm bg-destructive/25 border border-destructive/30"
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`${format(slotStart, "h:mm a")} – ${format(slotEnd, "h:mm a")}`}
              />
            )
          })}
        </div>

        {/* Hour labels */}
        <div className="relative flex">
          {hours.map((h) => (
            <div key={h} className="flex-1 px-0.5 py-1 text-center">
              <span className="text-[9px] text-muted-foreground/70">
                {h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ChatFreeBusy({ data }: { data: FreeBusyData }) {
  const rangeStart = parseISO(data.timeMin)
  const rangeEnd = parseISO(data.timeMax)
  const numDays = differenceInCalendarDays(rangeEnd, rangeStart) + 1

  // Find the working hours range across all busy slots
  let earliest = 8
  let latest = 18
  for (const slot of data.busy) {
    const s = parseISO(slot.start)
    const e = parseISO(slot.end)
    earliest = Math.min(earliest, s.getHours())
    latest = Math.max(latest, e.getHours() + 1)
  }

  // Clamp to reasonable bounds
  earliest = Math.max(0, earliest)
  latest = Math.min(24, latest)

  const totalBusyMinutes = data.busy.reduce((sum, slot) => {
    return sum + differenceInMinutes(parseISO(slot.end), parseISO(slot.start))
  }, 0)
  const busyHours = Math.round(totalBusyMinutes / 60 * 10) / 10

  const days = Array.from({ length: Math.min(numDays, 31) }, (_, i) => {
    const day = addDays(rangeStart, i)
    const dayBusy = data.busy.filter((slot) => {
      const slotStart = parseISO(slot.start)
      const slotEnd = parseISO(slot.end)
      return slotStart < endOfDay(day) && slotEnd > startOfDay(day)
    })
    return { date: day, busy: dayBusy }
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Clock className="size-3 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground">
          {busyHours}h busy across {numDays} day{numDays !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="inline-block size-2 rounded-sm bg-background border border-border/50" />
            Free
          </span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="inline-block size-2 rounded-sm bg-destructive/25 border border-destructive/30" />
            Busy
          </span>
        </div>
      </div>
      {days.map(({ date, busy }) => (
        <DayTimeline
          key={date.toISOString()}
          date={date}
          busy={busy}
          dayStart={earliest}
          dayEnd={latest}
        />
      ))}
    </div>
  )
}
