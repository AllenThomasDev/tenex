import { tool } from "ai";
import { z } from "zod";
import { createCalendarClient } from "./google-calendar";

export function createDisplayEventsTool(accessToken: string) {
  return tool({
    description:
      "Display calendar events to the user as a visual list. Use this instead of listEvents when the user explicitly asks to see, view, or show their events. Do NOT use this for internal reasoning — use listEvents for that.",
    inputSchema: z.object({
      calendarId: z
        .string()
        .default("primary")
        .describe("Calendar ID to query (use 'primary' for the main calendar)"),
      timeMin: z
        .string()
        .optional()
        .describe("Start of time range (ISO 8601, e.g., '2025-01-01T00:00:00Z')"),
      timeMax: z
        .string()
        .optional()
        .describe("End of time range (ISO 8601, e.g., '2025-01-31T23:59:59Z')"),
      timeZone: z
        .string()
        .optional()
        .describe("IANA timezone (e.g., 'America/Los_Angeles')"),
    }),
    execute: async ({ calendarId, timeMin, timeMax, timeZone }) => {
      const calendar = createCalendarClient(accessToken);

      const now = new Date();
      const oneWeekFromNow = new Date(now);
      oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

      const response = await calendar.events.list({
        calendarId,
        timeMin: timeMin ?? now.toISOString(),
        timeMax: timeMax ?? oneWeekFromNow.toISOString(),
        timeZone,
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 50,
      });

      return (response.data.items ?? []).map((event) => ({
        id: event.id,
        summary: event.summary,
        start: event.start?.dateTime ?? event.start?.date,
        end: event.end?.dateTime ?? event.end?.date,
        location: event.location,
        attendees: event.attendees?.map((a) => ({
          email: a.email,
          responseStatus: a.responseStatus,
        })),
      }));
    },
  });
}
