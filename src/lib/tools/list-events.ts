import { tool } from "ai";
import { google } from "googleapis";
import { z } from "zod";

export function createListEventsTool(accessToken: string) {
  return tool({
    description:
      "List upcoming calendar events for the next 7 days from the user's Google Calendar.",
    inputSchema: z.object({}),
    execute: async () => {
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });

      const calendar = google.calendar({ version: "v3", auth: oauth2Client });

      const now = new Date();
      const oneWeekFromNow = new Date(now);
      oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

      const response = await calendar.events.list({
        calendarId: "primary",
        timeMin: now.toISOString(),
        timeMax: oneWeekFromNow.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 20,
      });

      return (response.data.items ?? []).map((event) => ({
        id: event.id,
        summary: event.summary,
        start: event.start?.dateTime ?? event.start?.date,
        end: event.end?.dateTime ?? event.end?.date,
        location: event.location,
        attendees: event.attendees?.map((a) => a.email),
      }));
    },
  });
}
