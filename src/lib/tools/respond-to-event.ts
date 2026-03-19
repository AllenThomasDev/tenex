import { tool } from "ai";
import { z } from "zod";
import { getAffectedDayKeysForEvent } from "@/lib/calendar-day";
import { createCalendarClient } from "./google-calendar";

export function createRespondToEventTool(accessToken: string, userTimeZone: string) {
  return tool({
    description:
      "Respond to a calendar event invitation with Accept, Decline, Maybe, or No Response.",
    inputSchema: z.object({
      calendarId: z
        .string()
        .default("primary")
        .describe("ID of the calendar (use 'primary' for the main calendar)"),
      eventId: z.string().describe("ID of the event to respond to"),
      response: z
        .enum(["accepted", "declined", "tentative", "needsAction"])
        .describe("Your response to the event invitation"),
      sendUpdates: z
        .enum(["all", "externalOnly", "none"])
        .optional()
        .describe("Whether to send response notifications"),
    }),
    execute: async ({ calendarId, eventId, response, sendUpdates }) => {
      const calendar = createCalendarClient(accessToken);

      // Get current event to find the user's attendee entry
      const existing = await calendar.events.get({ calendarId, eventId });
      const attendees = existing.data.attendees ?? [];

      // Find self (marked by the API) and update response status
      const updated = attendees.map((a) =>
        a.self ? { ...a, responseStatus: response } : a,
      );

      const result = await calendar.events.patch({
        calendarId,
        eventId,
        sendUpdates,
        requestBody: { attendees: updated },
      });

      return {
        id: result.data.id,
        summary: result.data.summary,
        responseStatus: response,
        status: result.data.status,
        affectedDayKeys: getAffectedDayKeysForEvent(existing.data, userTimeZone),
      };
    },
  });
}
