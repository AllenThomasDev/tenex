import { tool } from "ai";
import { z } from "zod";
import { createCalendarClient } from "./google-calendar";

export function createGetCurrentTimeTool(accessToken: string) {
  return tool({
    description:
      "Get the current date and time. Call this FIRST before creating, updating, or searching for events to ensure you have accurate date context.",
    inputSchema: z.object({
      timeZone: z
        .string()
        .optional()
        .describe("IANA timezone (e.g., 'America/Los_Angeles'). Defaults to calendar's timezone."),
    }),
    execute: async ({ timeZone }) => {
      const now = new Date();

      if (timeZone) {
        return {
          dateTime: now.toLocaleString("en-US", { timeZone }),
          timeZone,
          iso: now.toISOString(),
        };
      }

      // Fall back to getting timezone from the user's primary calendar
      const calendar = createCalendarClient(accessToken);
      const calendarMeta = await calendar.calendars.get({ calendarId: "primary" });
      const tz = calendarMeta.data.timeZone ?? "UTC";

      return {
        dateTime: now.toLocaleString("en-US", { timeZone: tz }),
        timeZone: tz,
        iso: now.toISOString(),
      };
    },
  });
}
