import { tool } from "ai";
import { z } from "zod";
import { createCalendarClient } from "./google-calendar";

export function createSearchEventsTool(accessToken: string) {
  return tool({
    description:
      "Search for events by text query. Searches summary, description, location, and attendees.",
    inputSchema: z.object({
      calendarId: z
        .string()
        .default("primary")
        .describe("Calendar ID to search"),
      query: z
        .string()
        .describe("Free text search query"),
      timeMin: z
        .string()
        .describe("Start of time range (ISO 8601, e.g., '2025-01-01T00:00:00Z')"),
      timeMax: z
        .string()
        .describe("End of time range (ISO 8601, e.g., '2025-01-31T23:59:59Z')"),
      timeZone: z
        .string()
        .optional()
        .describe("IANA timezone (e.g., 'America/Los_Angeles')"),
    }),
    execute: async ({ calendarId, query, timeMin, timeMax, timeZone }) => {
      const calendar = createCalendarClient(accessToken);

      const response = await calendar.events.list({
        calendarId,
        q: query,
        timeMin,
        timeMax,
        timeZone,
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 50,
      });

      return (response.data.items ?? []).map((event) => ({
        id: event.id,
        summary: event.summary,
        description: event.description,
        start: event.start?.dateTime ?? event.start?.date,
        end: event.end?.dateTime ?? event.end?.date,
        location: event.location,
        htmlLink: event.htmlLink,
        attendees: event.attendees?.map((a) => ({
          email: a.email,
          responseStatus: a.responseStatus,
        })),
      }));
    },
  });
}
