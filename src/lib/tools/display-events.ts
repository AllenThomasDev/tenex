import { tool } from "ai";
import { z } from "zod";
import { createCalendarClient } from "./google-calendar";

export function createDisplayEventsTool(accessToken: string) {
  return tool({
    description:
      "Display calendar events to the user as a visual list. Use this instead of listEvents when the user explicitly asks to see, view, or show their events. Do NOT use this for internal reasoning — use listEvents for that.",
    inputSchema: z.object({
      eventIds: z
        .array(z.string())
        .describe("Event IDs to display (obtained from listEvents)"),
      calendarId: z
        .string()
        .default("primary")
        .describe("Calendar ID to query (use 'primary' for the main calendar)"),
    }),
    execute: async ({ eventIds, calendarId }) => {
      const calendar = createCalendarClient(accessToken);

      const events = await Promise.all(
        eventIds.map(async (id) => {
          const response = await calendar.events.get({
            calendarId,
            eventId: id,
          });
          const event = response.data;
          return {
            id: event.id,
            summary: event.summary,
            start: event.start?.dateTime ?? event.start?.date,
            end: event.end?.dateTime ?? event.end?.date,
            location: event.location,
            attendees: event.attendees?.map((a) => ({
              email: a.email,
              responseStatus: a.responseStatus,
            })),
          };
        }),
      );

      return events;
    },
  });
}
