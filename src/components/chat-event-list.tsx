"use client"

import { format, parseISO, isSameDay } from "date-fns"
import { Calendar, MapPin, Users } from "lucide-react"

type EventItem = {
  id: string
  summary: string
  start: string
  end: string
  location?: string | null
  attendees?: { email: string; responseStatus?: string }[]
}

function formatTime(iso: string) {
  if (iso.length === 10) return "All day"
  return format(parseISO(iso), "h:mm a")
}

function formatTimeRange(start: string, end: string) {
  if (start.length === 10) return "All day"
  return `${formatTime(start)} – ${formatTime(end)}`
}

function EventCard({ event }: { event: EventItem }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/50 px-3 py-2">
      <span className="min-w-[3.5rem] text-xs font-medium text-muted-foreground">
        {formatTime(event.start)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight text-foreground truncate">
          {event.summary ?? "(No title)"}
        </p>
        {(event.location || (event.attendees && event.attendees.length > 0)) && (
          <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
            {event.location && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="size-2.5 shrink-0" />
                {event.location}
              </span>
            )}
            {event.attendees && event.attendees.length > 0 && (
              <span className="flex items-center gap-1">
                <Users className="size-2.5 shrink-0" />
                {event.attendees.length}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function groupByDay(events: EventItem[]) {
  const groups: { date: string; events: EventItem[] }[] = []
  for (const event of events) {
    const last = groups[groups.length - 1]
    if (last && isSameDay(parseISO(last.date), parseISO(event.start))) {
      last.events.push(event)
    } else {
      groups.push({ date: event.start, events: [event] })
    }
  }
  return groups
}

export function ChatEventList({ events }: { events: EventItem[] }) {
  if (events.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/50 px-3 py-3 text-sm text-muted-foreground">
        <Calendar className="size-4" />
        No events found
      </div>
    )
  }

  const days = groupByDay(events)

  return (
    <div className="space-y-3">
      {days.map((day) => (
        <div key={day.date} className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground px-1">
            {format(parseISO(day.date), "EEEE, MMM d")}
          </p>
          {day.events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ))}
    </div>
  )
}
