"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import { CalendarRange, CheckCircle2, CircleDot, Clock3, MapPin, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useDayEvents } from "@/hooks/use-day-events"
import type { DayEvent, EventTimingState } from "@/hooks/use-day-events"

type DayEventsProps = {
  date: Date
  dayKey?: string
  selectedEventId?: string | null
  onSelectEvent?: (id: string | null) => void
}

function formatTime(dateString?: string) {
  if (!dateString) {
    return "Time unavailable"
  }

  const date = parseISO(dateString)

  if (Number.isNaN(date.getTime())) {
    return "Time unavailable"
  }

  return format(date, "hh:mma").toLowerCase()
}

function getEventTimeLabel(event: DayEvent) {
  return event.isAllDay ? "All day" : `${formatTime(event.start)} - ${formatTime(event.end)}`
}

function EventDetails({
  event,
  iconClassName,
  textClassName,
  compact = false,
}: {
  event: DayEvent
  iconClassName?: string
  textClassName?: string
  compact?: boolean
}) {
  if (!event.location && event.attendeesCount === 0) {
    return null
  }

  return (
    <div
      className={cn(
        "flex flex-wrap gap-x-4 gap-y-1.5 text-sm",
        compact && "gap-x-3 gap-y-1 text-[13px]",
        textClassName,
      )}
    >
      {event.location ? (
        <div className="inline-flex min-w-0 items-center gap-2">
          <MapPin className={cn("size-4 shrink-0", iconClassName)} />
          <span className="break-words">{event.location}</span>
        </div>
      ) : null}

      {event.attendeesCount > 0 ? (
        <div className="inline-flex items-center gap-2">
          <Users className={cn("size-4 shrink-0", iconClassName)} />
          <span>
            {event.attendeesCount} attendee
            {event.attendeesCount === 1 ? "" : "s"}
          </span>
        </div>
      ) : null}
    </div>
  )
}

function DenseEventCard({
  event,
  index,
  isSelected,
  timingState,
  onSelect,
}: {
  event: DayEvent
  index: number
  isSelected?: boolean
  timingState?: EventTimingState
  onSelect?: () => void
}) {
  const hasDetails = Boolean(event.location) || event.attendeesCount > 0
  const timingLabel = timingState === "past" ? "Done" : timingState === "current" ? "Now" : null
  const surfaceClassName = cn(
    "bg-card",
    timingState === "current" && "bg-primary/[0.03]",
  )

  return (
    <article
      className={cn(
        "group flex border border-border bg-card text-card-foreground transition-colors hover:border-primary",
        timingState === "past" && "border-dashed opacity-50",
        timingState === "current" && "border-primary/60 bg-primary/[0.03] shadow-[0_0_0_1px_rgba(0,0,0,0.02)]",
        isSelected && "border-primary ring-1 ring-primary/30",
        onSelect && "cursor-pointer",
      )}
      onClick={onSelect}
    >
      {event.color ? (
        <div
          className="w-1 shrink-0"
          style={{ backgroundColor: event.color.background }}
        />
      ) : null}
      <div className="flex-1 min-w-0">
        <div className="grid gap-px bg-border md:grid-cols-[auto_minmax(0,1fr)_auto]">
          <div className={cn(surfaceClassName, "px-3 py-2.5")}>
            <div className={cn(
              "flex min-h-10 items-center text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground [font-family:var(--font-geist-mono)]",
              timingState === "current" && "text-primary",
            )}>
              {getEventTimeLabel(event)}
            </div>
          </div>
          <div className={cn(surfaceClassName, "px-3 py-2.5")}>
            <div className="flex min-h-10 items-center justify-between gap-3">
              <h3 className={cn(
                "break-words text-base font-semibold tracking-[-0.03em] text-balance",
              )}>
                {event.title}
              </h3>
              {timingLabel ? (
                <span className={cn(
                  "shrink-0 text-[10px] font-medium uppercase tracking-[0.22em] [font-family:var(--font-geist-mono)]",
                  timingState === "current" && "text-primary",
                )}>
                  {timingLabel}
                </span>
              ) : null}
            </div>
          </div>
          <div className={cn(surfaceClassName, "px-3 py-2.5")}>
            <div className={cn(
              "flex min-h-10 items-center justify-end text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground [font-family:var(--font-geist-mono)] md:text-right",
              timingState === "current" && "text-primary/80",
            )}>
              #{String(index + 1).padStart(2, "0")}
            </div>
          </div>
        </div>

        {hasDetails ? (
          <div className="border-t border-border px-3 py-2.5">
            <EventDetails
              event={event}
              iconClassName={cn(
                "text-muted-foreground",
                timingState === "current" && "text-primary/80",
              )}
              textClassName="text-muted-foreground"
              compact
            />
          </div>
        ) : null}
      </div>
    </article>
  )
}

function DayEventsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="border border-border bg-background p-5 shadow-sm"
        >
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-4 h-7 w-2/3" />
          <Skeleton className="mt-4 h-4 w-28" />
        </div>
      ))}
    </div>
  )
}

export function DayEvents({ date, dayKey, selectedEventId, onSelectEvent }: DayEventsProps) {
  const {
    events,
    orderedEvents,
    eventSummary,
    error,
    isLoading,
    mutate,
    isViewingToday,
    isViewingPastDay,
  } = useDayEvents(date, dayKey)
  const showSkeleton = !events && isLoading

  return (
    <section aria-labelledby="events-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="events-heading" className="text-xl font-semibold text-foreground">
            Events
          </h2>
        </div>
        <div aria-live="polite" className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] [font-family:var(--font-geist-mono)]">
          {isViewingToday ? (
            <>
              <span
                className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground"
                aria-label={`${eventSummary.past} done`}
                title={`${eventSummary.past} done`}
              >
                <CheckCircle2 className="mr-1 inline size-3" />
                <span className="mr-1 text-foreground/90">{eventSummary.past}</span>
                <span>Done</span>
              </span>
              <span
                className="rounded-full bg-primary/10 px-2.5 py-1 text-primary"
                aria-label={`${eventSummary.current} now`}
                title={`${eventSummary.current} now`}
              >
                <CircleDot className="mr-1 inline size-3" />
                <span className="mr-1">{eventSummary.current}</span>
                <span>Now</span>
              </span>
              <span
                className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground"
                aria-label={`${eventSummary.upcoming} upcoming`}
                title={`${eventSummary.upcoming} upcoming`}
              >
                <Clock3 className="mr-1 inline size-3" />
                <span className="mr-1">{eventSummary.upcoming}</span>
                <span>Next</span>
              </span>
            </>
          ) : isViewingPastDay ? null : (
            <span className="text-sm normal-case tracking-normal text-muted-foreground [font-family:var(--font-sans)]">
              {showSkeleton ? "" : `${eventSummary.total} planned`}
            </span>
          )}
        </div>
      </div>

      {showSkeleton ? <DayEventsSkeleton /> : null}

      {!showSkeleton && error ? (
        <div className="border border-destructive/40 bg-destructive/10 p-5 text-destructive">
          <p className="text-sm font-medium">Couldn&apos;t load the day&apos;s events.</p>
          <p className="mt-1 text-sm text-destructive/80">{error.message}</p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => mutate()}
          >
            Try again
          </Button>
        </div>
      ) : null}

      {!showSkeleton && !error && events?.length === 0 ? (
        <div className="border border-dashed border-border bg-muted/30 p-8 text-center">
          <div className="mx-auto flex size-12 items-center justify-center border border-border bg-muted text-muted-foreground">
            <CalendarRange className="size-5" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            No events for this day
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Your schedule is clear. Use the chat to plan something new.
          </p>
        </div>
      ) : null}

      {!showSkeleton && !error && orderedEvents && orderedEvents.length > 0 ? (
        <div className="space-y-3">
          {orderedEvents.map(({ event, timingState }, index) => {
            return (
              <DenseEventCard
                key={event.id ?? `${event.title}-${event.start ?? index}`}
                event={event}
                index={index}
                isSelected={Boolean(event.id && event.id === selectedEventId)}
                timingState={timingState}
                onSelect={onSelectEvent ? () => onSelectEvent(event.id ?? null) : undefined}
              />
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
