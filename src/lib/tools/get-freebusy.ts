import { tool } from "ai";
import { z } from "zod";
import { createCalendarClient } from "./google-calendar";

export function createGetFreeBusyTool(accessToken: string) {
  return tool({
    description:
      "Query free/busy information for calendars. Useful for checking availability before scheduling.",
    inputSchema: z.object({
      calendars: z
        .array(
          z.object({
            id: z
              .string()
              .describe("Calendar ID (use 'primary' for the main calendar)"),
          }),
        )
        .describe("List of calendars to check"),
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
    execute: async ({ calendars, timeMin, timeMax, timeZone }) => {
      const calendar = createCalendarClient(accessToken);

      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin,
          timeMax,
          timeZone,
          items: calendars,
        },
      });

      const result: Record<string, { busy: Array<{ start: string; end: string }> }> = {};
      const calendarData = response.data.calendars ?? {};

      for (const [id, info] of Object.entries(calendarData)) {
        result[id] = {
          busy: (info.busy ?? []).map((slot) => ({
            start: slot.start ?? "",
            end: slot.end ?? "",
          })),
        };
      }

      return result;
    },
  });
}
