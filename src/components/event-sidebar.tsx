"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import useSWR from "swr"
import {
  Video,
  ExternalLink,
  MapPin,
  Check,
  HelpCircle,
  X,
  Clock,
  Repeat,
  Lock,
  Globe,
  ArrowUpRight,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

// ─── Shared type (mirrors DayEvent from day-events.tsx) ─────────────────────

type DayEvent = {
  id?: string
  title: string
  start?: string
  end?: string
  isAllDay: boolean
  location?: string
  attendeesCount: number
  attendees?: { email?: string; displayName?: string; responseStatus?: string; self?: boolean; optional?: boolean }[]
  status?: string
  htmlLink?: string
  description?: string
  hangoutLink?: string
  conferenceLink?: string
  organizer?: { email?: string; displayName?: string; self?: boolean }
  selfResponseStatus?: string
  colorId?: string
  recurringEventId?: string
  visibility?: string
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function fmtTime(dateString?: string) {
  if (!dateString) return null
  const d = parseISO(dateString)
  if (Number.isNaN(d.getTime())) return null
  return format(d, "h:mm a")
}

function timeRange(event: DayEvent) {
  if (event.isAllDay) return "ALL DAY"
  const s = fmtTime(event.start)
  const e = fmtTime(event.end)
  if (!s) return "TIME TBD"
  return e ? `${s} – ${e}` : s
}

const rsvpConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  accepted:    { label: "Accepted",  icon: Check,        className: "text-emerald-400" },
  declined:    { label: "Declined",  icon: X,            className: "text-red-400" },
  tentative:   { label: "Maybe",     icon: HelpCircle,   className: "text-amber-400" },
  needsAction: { label: "Pending",   icon: Clock,        className: "text-muted-foreground" },
}

function RsvpBadge({ status }: { status?: string }) {
  const cfg = status ? rsvpConfig[status] : null
  if (!cfg) return null
  const Icon = cfg.icon
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] [font-family:var(--font-geist-mono)]", cfg.className)}>
      <Icon className="size-3" />
      {cfg.label}
    </span>
  )
}

function statusDot(status?: string) {
  switch (status) {
    case "confirmed":  return "bg-emerald-400"
    case "tentative":  return "bg-amber-400"
    case "cancelled":  return "bg-red-400"
    default:           return "bg-muted-foreground/40"
  }
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground [font-family:var(--font-geist-mono)] text-center leading-relaxed">
        Select an event<br />to view details
      </p>
    </div>
  )
}

// ─── Inspector ──────────────────────────────────────────────────────────────

function InspectorRow({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-[6rem_1fr] gap-3 px-4 py-2.5 border-b border-border", className)}>
      <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground [font-family:var(--font-geist-mono)] pt-0.5">
        {label}
      </span>
      <div className="text-[13px] text-foreground min-w-0">{children}</div>
    </div>
  )
}

function Inspector({ event }: { event: DayEvent | null }) {
  if (!event) return <EmptyState />

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-card px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={cn("size-2 shrink-0", statusDot(event.status))} />
              <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground [font-family:var(--font-geist-mono)]">
                {timeRange(event)}
              </span>
            </div>
            <h3 className="text-base font-semibold tracking-[-0.03em] text-foreground break-words">
              {event.title}
            </h3>
          </div>
          {event.htmlLink ? (
            <a
              href={event.htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center justify-center size-7 border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              title="Open in Google Calendar"
            >
              <ExternalLink className="size-3.5" />
            </a>
          ) : null}
        </div>
      </div>

      {/* Properties */}
      <div className="flex-1 overflow-y-auto">
        {event.selfResponseStatus ? (
          <InspectorRow label="RSVP">
            <RsvpBadge status={event.selfResponseStatus} />
          </InspectorRow>
        ) : null}

        {event.conferenceLink ? (
          <InspectorRow label="Call">
            <a
              href={event.conferenceLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline underline-offset-2"
            >
              <Video className="size-3.5" />
              Join video call
              <ArrowUpRight className="size-3" />
            </a>
          </InspectorRow>
        ) : null}

        {event.location ? (
          <InspectorRow label="Location">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-start gap-1.5 text-[13px] font-medium text-primary hover:underline underline-offset-2"
            >
              <MapPin className="size-3.5 mt-0.5 shrink-0" />
              <span className="break-words">{event.location}</span>
              <ArrowUpRight className="size-3 mt-0.5 shrink-0" />
            </a>
          </InspectorRow>
        ) : null}

        {event.organizer && !event.organizer.self ? (
          <InspectorRow label="Organizer">
            <span className="break-words">
              {event.organizer.displayName || event.organizer.email}
            </span>
          </InspectorRow>
        ) : null}

        {event.attendees && event.attendees.length > 0 ? (
          <div className="px-4 py-2.5 border-b border-border">
            <span className="block text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground [font-family:var(--font-geist-mono)] mb-2">
              Guests ({event.attendees.length})
            </span>
            <ul className="space-y-1.5">
              {event.attendees.map((a) => {
                const rsvp = a.responseStatus ? rsvpConfig[a.responseStatus] : null
                return (
                  <li key={a.email} className="flex items-center gap-2 min-w-0">
                    {rsvp ? (
                      <span className={cn("shrink-0", rsvp.className)}>
                        {React.createElement(rsvp.icon, { className: "size-3" })}
                      </span>
                    ) : null}
                    <span className="truncate text-[13px] text-foreground">
                      {a.displayName || a.email}
                      {a.self ? <span className="text-muted-foreground"> (you)</span> : null}
                      {a.optional ? <span className="text-muted-foreground"> · optional</span> : null}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}

        {event.recurringEventId ? (
          <InspectorRow label="Series">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Repeat className="size-3.5" />
              Recurring event
            </span>
          </InspectorRow>
        ) : null}

        {event.visibility ? (
          <InspectorRow label="Visibility">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              {event.visibility === "private" ? <Lock className="size-3.5" /> : <Globe className="size-3.5" />}
              {event.visibility === "private" ? "Private" : "Public"}
            </span>
          </InspectorRow>
        ) : null}

        <div className="px-4 py-3 border-b border-border">
          <span className="block text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground [font-family:var(--font-geist-mono)] mb-2">
            Notes
          </span>
          {event.description ? (
            <p className="text-[13px] leading-relaxed text-foreground/80 whitespace-pre-wrap break-words">
              {event.description}
            </p>
          ) : (
            <p className="text-[12px] leading-relaxed text-muted-foreground/50">
              No notes added yet. Press{" "}
              <kbd className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[10px] font-medium border border-border bg-muted/40 [font-family:var(--font-geist-mono)]">
                <span className="text-[9px]">&#8984;</span>I
              </kbd>
              {" "}to ask Cal-El to add notes and much more!
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Panel wrapper ──────────────────────────────────────────────────────────

type CalendarDayResponse = {
  date: string
  events: DayEvent[]
}

async function fetchEvents(url: string): Promise<DayEvent[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to load events")
  const data = (await res.json()) as CalendarDayResponse
  return data.events
}

type EventSidebarPanelProps = {
  dayKey: string
  selectedEventId?: string | null
}

export function EventSidebarPanel({ dayKey, selectedEventId }: EventSidebarPanelProps) {
  const { data: events, isLoading } = useSWR<DayEvent[]>(dayKey, fetchEvents)

  const selectedEvent = React.useMemo(() => {
    if (!events || !selectedEventId) return null
    return events.find((e) => e.id === selectedEventId) ?? null
  }, [events, selectedEventId])

  if (isLoading || !events) {
    return (
      <div className="flex h-full flex-col">
        <div className="shrink-0 px-4 py-3 border-b border-border">
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex-1 p-4 space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    )
  }

  return <Inspector event={selectedEvent} />
}
