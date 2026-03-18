import { tool } from "ai";
import { z } from "zod";
import { createCalendarClient } from "./google-calendar";
import { parseTimeInput } from "./parse-time-input";

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
        .string()
        .describe(
          "Event start time. Use ISO 8601: '2025-03-18T16:50:00-05:00' for timed events, '2025-03-18' for all-day events."
        ),
      end: z
        .string()
        .describe(
          "Event end time. Use ISO 8601: '2025-03-18T17:00:00-05:00' for timed events, '2025-03-19' for all-day (exclusive)."
        ),
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

      try {
        const response = await calendar.events.insert({
          calendarId,
          sendUpdates,
          conferenceDataVersion: 1,
          requestBody: {
            summary,
            description,
            start: parseTimeInput(start),
            end: parseTimeInput(end),
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
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        const details =
          error &&
          typeof error === "object" &&
          "response" in error &&
          (error as any).response?.data?.error?.message;
        throw new Error(
          `Failed to create event: ${details || message}. ` +
            `Received start: ${JSON.stringify(start)}, end: ${JSON.stringify(end)}`
        );
      }
    },
  });
}
