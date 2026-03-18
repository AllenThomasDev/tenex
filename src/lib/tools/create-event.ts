import { tool } from "ai";
import { z } from "zod";
import { createCalendarClient } from "./google-calendar";

export function createCreateEventTool(accessToken: string) {
  return tool({
    description: "Create a new calendar event.",
    inputSchema: z.object({
      calendarId: z
        .string()
        .default("primary")
        .describe("ID of the calendar (use 'primary' for the main calendar)"),
      summary: z.string().describe("Title of the event"),
      description: z.string().optional().describe("Description/notes for the event"),
      start: z
        .object({
          dateTime: z.string().optional().describe("ISO 8601 datetime for timed events"),
          date: z.string().optional().describe("YYYY-MM-DD for all-day events"),
          timeZone: z.string().optional().describe("IANA timezone (e.g., 'America/Los_Angeles')"),
        })
        .describe("Event start time. Provide either dateTime or date, not both."),
      end: z
        .object({
          dateTime: z.string().optional().describe("ISO 8601 datetime for timed events"),
          date: z.string().optional().describe("YYYY-MM-DD for all-day events"),
          timeZone: z.string().optional().describe("IANA timezone (e.g., 'America/Los_Angeles')"),
        })
        .describe("Event end time. Provide either dateTime or date, not both."),
      location: z.string().optional().describe("Location of the event"),
      attendees: z
        .array(
          z.object({
            email: z.string().describe("Email address of the attendee"),
          }),
        )
        .optional()
        .describe("List of event attendees"),
      recurrence: z
        .array(z.string())
        .optional()
        .describe(
          'Recurrence rules in RFC5545 format (e.g., ["RRULE:FREQ=WEEKLY;COUNT=5"])',
        ),
      reminders: z
        .object({
          useDefault: z.boolean().describe("Whether to use default reminders"),
          overrides: z
            .array(
              z.object({
                method: z.enum(["email", "popup"]).describe("Reminder method"),
                minutes: z.number().describe("Minutes before the event"),
              }),
            )
            .optional(),
        })
        .optional()
        .describe("Reminder settings"),
      colorId: z
        .string()
        .optional()
        .describe("Color ID for the event (use list-colors to see available IDs)"),
      visibility: z
        .enum(["default", "public", "private", "confidential"])
        .optional()
        .describe("Visibility of the event"),
      transparency: z
        .enum(["opaque", "transparent"])
        .optional()
        .describe("Whether the event blocks time. 'opaque' = busy, 'transparent' = free"),
      sendUpdates: z
        .enum(["all", "externalOnly", "none"])
        .optional()
        .describe("Whether to send notifications about the event creation"),
    }),
    execute: async ({
      calendarId,
      summary,
      description,
      start,
      end,
      location,
      attendees,
      recurrence,
      reminders,
      colorId,
      visibility,
      transparency,
      sendUpdates,
    }) => {
      const calendar = createCalendarClient(accessToken);

      const response = await calendar.events.insert({
        calendarId,
        sendUpdates,
        conferenceDataVersion: 1,
        requestBody: {
          summary,
          description,
          start,
          end,
          location,
          attendees,
          recurrence,
          reminders,
          colorId,
          visibility,
          transparency,
        },
      });

      return {
        id: response.data.id,
        summary: response.data.summary,
        start:
          response.data.start?.dateTime ?? response.data.start?.date,
        end: response.data.end?.dateTime ?? response.data.end?.date,
        htmlLink: response.data.htmlLink,
        status: response.data.status,
      };
    },
  });
}
