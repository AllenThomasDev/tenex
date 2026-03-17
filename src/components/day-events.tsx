"use client"

import * as React from "react"
import { format, formatDistanceStrict, parseISO } from "date-fns"
import { CalendarRange, Clock3, MapPin, Users } from "lucide-react"
import useSWR from "swr"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { getCalendarDayKey } from "@/lib/calendar-day"

type DayEvent = {
  id?: string
  title: string
  start?: string
  end?: string
  isAllDay: boolean
  location?: string
  attendeesCount: number
}

type CalendarDayResponse = {
  date: string
  events: DayEvent[]
}

type DayEventsProps = {
  date: Date
  dayKey?: string
}

function formatTime(dateString?: string) {
  if (!dateString) {
    return "Time unavailable"
  }

  const date = parseISO(dateString)

  if (Number.isNaN(date.getTime())) {
    return "Time unavailable"
  }

  return format(date, "p")
}

function formatDuration(start?: string, end?: string) {
  if (!start || !end) {
    return null
  }

  const startDate = parseISO(start)
  const endDate = parseISO(end)

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null
  }

  return formatDistanceStrict(startDate, endDate)
}

function DayEventsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="rounded-3xl border border-zinc-200/70 bg-white/80 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80"
        >
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-4 h-7 w-2/3" />
          <Skeleton className="mt-4 h-4 w-28" />
        </div>
      ))}
    </div>
  )
}

async function fetchEvents(url: string): Promise<DayEvent[]> {
  const response = await fetch(url)

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      error?: string
    } | null

    throw new Error(data?.error ?? "Could not load calendar events.")
  }

  const data = (await response.json()) as CalendarDayResponse

  return data.events
}

export function DayEvents({ date, dayKey }: DayEventsProps) {
  const swrKey = React.useMemo(() => dayKey ?? getCalendarDayKey(date), [date, dayKey])
  const { data: events, error, isLoading, mutate } = useSWR<DayEvent[]>(
    swrKey,
    fetchEvents,
  )

  return (
    <section aria-labelledby="events-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 id="events-heading" className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
            Events
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Your schedule for the selected day.
          </p>
        </div>
        <p aria-live="polite" className="text-sm text-zinc-500 dark:text-zinc-400">
          {isLoading ? "Refreshing events…" : `${events?.length ?? 0} planned`}
        </p>
      </div>

      {isLoading ? <DayEventsSkeleton /> : null}

      {!isLoading && error ? (
        <div className="rounded-3xl border border-amber-300/60 bg-amber-50/80 p-5 text-amber-950 dark:border-amber-700/40 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="text-sm font-medium">Couldn&apos;t load the day&apos;s events.</p>
          <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-100/80">{error.message}</p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => mutate()}
          >
            Try again
          </Button>
        </div>
      ) : null}

      {!isLoading && !error && events?.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-300 bg-white/70 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/70">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
            <CalendarRange className="size-5" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            No events for this day
          </h3>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Your schedule is clear. Use the chat to plan something new.
          </p>
        </div>
      ) : null}

      {!isLoading && !error && events && events.length > 0 ? (
        <div className="space-y-3">
          {events.map((event, index) => {
            const duration = event.isAllDay ? null : formatDuration(event.start, event.end)

            return (
              <article
                key={event.id ?? `${event.title}-${event.start ?? index}`}
                className={cn(
                  "rounded-3xl border p-5 shadow-sm transition-colors",
                  event.isAllDay
                    ? "border-sky-200 bg-sky-50/70 dark:border-sky-800/60 dark:bg-sky-950/30"
                    : "border-zinc-200/70 bg-white/85 dark:border-zinc-800 dark:bg-zinc-900/80",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                          event.isAllDay
                            ? "bg-sky-600/10 text-sky-700 dark:bg-sky-400/15 dark:text-sky-200"
                            : "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950",
                        )}
                      >
                        {event.isAllDay
                          ? "All day"
                          : `${formatTime(event.start)} - ${formatTime(event.end)}`}
                      </span>
                      {duration ? (
                        <span className="inline-flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
                          <Clock3 className="size-3.5" />
                          {duration}
                        </span>
                      ) : null}
                    </div>

                    <h3 className="break-words text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                      {event.title}
                    </h3>
                  </div>

                  <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {index + 1}
                  </div>
                </div>

                {event.location || event.attendeesCount > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-zinc-600 dark:text-zinc-300">
                    {event.location ? (
                      <div className="inline-flex min-w-0 items-center gap-2">
                        <MapPin className="size-4 text-zinc-400 dark:text-zinc-500" />
                        <span className="break-words">{event.location}</span>
                      </div>
                    ) : null}

                    {event.attendeesCount > 0 ? (
                      <div className="inline-flex items-center gap-2">
                        <Users className="size-4 text-zinc-400 dark:text-zinc-500" />
                        <span>
                          {event.attendeesCount} attendee
                          {event.attendeesCount === 1 ? "" : "s"}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
