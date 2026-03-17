import { tool } from "ai";
import { z } from "zod";
import { createCalendarClient } from "./google-calendar";

export function createListColorsTool(accessToken: string) {
  return tool({
    description: "List available color IDs and their hex values for calendar events.",
    inputSchema: z.object({}),
    execute: async () => {
      const calendar = createCalendarClient(accessToken);
      const response = await calendar.colors.get();

      const eventColors: Record<string, { background: string; foreground: string }> = {};
      const colors = response.data.event ?? {};

      for (const [id, color] of Object.entries(colors)) {
        eventColors[id] = {
          background: color.background ?? "",
          foreground: color.foreground ?? "",
        };
      }

      return { eventColors };
    },
  });
}
