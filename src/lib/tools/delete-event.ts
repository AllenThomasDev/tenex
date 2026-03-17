import { tool } from "ai";
import { z } from "zod";
import { createCalendarClient } from "./google-calendar";

export function createDeleteEventTool(accessToken: string) {
  return tool({
    description: "Delete a calendar event.",
    inputSchema: z.object({
      calendarId: z
        .string()
        .default("primary")
        .describe("ID of the calendar (use 'primary' for the main calendar)"),
      eventId: z.string().describe("ID of the event to delete"),
      sendUpdates: z
        .enum(["all", "externalOnly", "none"])
        .default("all")
        .describe("Whether to send cancellation notifications"),
    }),
    execute: async ({ calendarId, eventId, sendUpdates }) => {
      const calendar = createCalendarClient(accessToken);

      await calendar.events.delete({
        calendarId,
        eventId,
        sendUpdates,
      });

      return { deleted: true, eventId };
    },
  });
}
