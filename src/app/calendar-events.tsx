"use client";

import { useEffect, useState } from "react";

interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  location?: string;
  attendees?: string[];
}

export function CalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/calendar")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setEvents(data.events);
        }
      })
      .catch(() => setError("Failed to fetch events"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-zinc-500">Loading events...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (events.length === 0)
    return <p className="text-zinc-500">No upcoming events this week.</p>;

  return (
    <ul className="w-full max-w-md space-y-3">
      {events.map((event) => {
        const start = new Date(event.start);
        return (
          <li
            key={event.id}
            className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              {event.summary ?? "Untitled"}
            </p>
            <p className="text-sm text-zinc-500">
              {start.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}{" "}
              at{" "}
              {start.toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
            {event.location && (
              <p className="text-sm text-zinc-400">{event.location}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
