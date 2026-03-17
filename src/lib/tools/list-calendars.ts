import { tool } from "ai";
import { z } from "zod";
import { createCalendarClient } from "./google-calendar";

export function createListCalendarsTool(accessToken: string) {
  return tool({
    description: "List all available calendars for the user.",
    inputSchema: z.object({}),
    execute: async () => {
      const calendar = createCalendarClient(accessToken);
      const response = await calendar.calendarList.list();

      return (response.data.items ?? []).map((cal) => ({
        id: cal.id,
        summary: cal.summary,
        description: cal.description,
        primary: cal.primary ?? false,
        backgroundColor: cal.backgroundColor,
        accessRole: cal.accessRole,
      }));
    },
  });
}
