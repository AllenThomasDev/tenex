import { tool } from "ai";
import { z } from "zod";
import { createCalendarClient } from "./google-calendar";

export function createDisplayFreeBusyTool(accessToken: string) {
  return tool({
    description:
      "Display a visual free/busy availability timeline to the user. Use this when the user asks to SEE their availability, free time, or busy periods for any time range. Do NOT add any text summary — the UI component handles the display.",
    inputSchema: z.object({
      timeMin: z
        .string()
        .describe("Start of time range (ISO 8601)"),
      timeMax: z
        .string()
        .describe("End of time range (ISO 8601)"),
      timeZone: z
        .string()
        .optional()
        .describe("IANA timezone (e.g., 'America/Chicago')"),
    }),
    execute: async ({ timeMin, timeMax, timeZone }) => {
      const calendar = createCalendarClient(accessToken);

      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin,
          timeMax,
          timeZone,
          items: [{ id: "primary" }],
        },
      });

      const calendarData = response.data.calendars ?? {};
      const primary = calendarData["primary"];

      return {
        timeMin,
        timeMax,
        timeZone,
        busy: (primary?.busy ?? []).map((slot) => ({
          start: slot.start ?? "",
          end: slot.end ?? "",
        })),
      };
    },
  });
}
