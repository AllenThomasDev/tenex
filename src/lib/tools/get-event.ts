import { tool } from "ai";
import { z } from "zod";
import { createCalendarClient } from "./google-calendar";

export function createGetEventTool(accessToken: string) {
  return tool({
    description: "Get details of a specific event by ID.",
    inputSchema: z.object({
      calendarId: z
        .string()
        .default("primary")
        .describe("ID of the calendar (use 'primary' for the main calendar)"),
      eventId: z.string().describe("ID of the event to retrieve"),
    }),
    execute: async ({ calendarId, eventId }) => {
      const calendar = createCalendarClient(accessToken);
      const response = await calendar.events.get({ calendarId, eventId });
      const event = response.data;

      return {
        id: event.id,
        summary: event.summary,
        description: event.description,
        start: event.start?.dateTime ?? event.start?.date,
        end: event.end?.dateTime ?? event.end?.date,
        location: event.location,
        status: event.status,
        htmlLink: event.htmlLink,
        organizer: event.organizer,
        attendees: event.attendees?.map((a) => ({
          email: a.email,
          displayName: a.displayName,
          responseStatus: a.responseStatus,
          optional: a.optional,
        })),
        recurrence: event.recurrence,
        reminders: event.reminders,
        conferenceData: event.conferenceData,
      };
    },
  });
}
