import { tool } from "ai";
import { z } from "zod";
import { createCalendarClient } from "./google-calendar";

export function createUpdateEventTool(accessToken: string) {
  return tool({
    description:
      "Update an existing calendar event. Only provide fields you want to change.",
    inputSchema: z.object({
      calendarId: z
        .string()
        .default("primary")
        .describe("ID of the calendar (use 'primary' for the main calendar)"),
      eventId: z.string().describe("ID of the event to update"),
      summary: z.string().nullable().optional().describe("Updated title of the event"),
      description: z.string().nullable().optional().describe("Updated description/notes"),
      start: z
        .object({
          dateTime: z.string().optional().describe("ISO 8601 datetime for timed events"),
          date: z.string().optional().describe("YYYY-MM-DD for all-day events"),
          timeZone: z.string().optional().describe("IANA timezone (e.g., 'America/Los_Angeles')"),
        })
        .nullable()
        .optional()
        .describe("Updated start time. Provide either dateTime or date, not both."),
      end: z
        .object({
          dateTime: z.string().optional().describe("ISO 8601 datetime for timed events"),
          date: z.string().optional().describe("YYYY-MM-DD for all-day events"),
          timeZone: z.string().optional().describe("IANA timezone (e.g., 'America/Los_Angeles')"),
        })
        .nullable()
        .optional()
        .describe("Updated end time. Provide either dateTime or date, not both."),
      location: z.string().nullable().optional().describe("Updated location"),
      attendees: z
        .array(
          z.object({
            email: z.string().describe("Email address of the attendee"),
          }),
        )
        .nullable()
        .optional()
        .describe("Updated attendee list"),
      colorId: z.string().nullable().optional().describe("Updated color ID"),
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
        .nullable()
        .optional()
        .describe("Updated reminder settings"),
      recurrence: z
        .array(z.string())
        .nullable()
        .optional()
        .describe("Updated recurrence rules in RFC5545 format"),
      visibility: z
        .enum(["default", "public", "private", "confidential"])
        .nullable()
        .optional()
        .describe("Visibility of the event"),
      transparency: z
        .enum(["opaque", "transparent"])
        .nullable()
        .optional()
        .describe("Whether the event blocks time"),
      sendUpdates: z
        .enum(["all", "externalOnly", "none"])
        .default("none")
        .describe("Whether to send update notifications"),
    }),
    execute: async ({
      calendarId,
      eventId,
      summary,
      description,
      start,
      end,
      location,
      attendees,
      colorId,
      reminders,
      recurrence,
      visibility,
      transparency,
      sendUpdates,
    }) => {
      const calendar = createCalendarClient(accessToken);

      const requestBody: Record<string, unknown> = {};
      if (summary != null) requestBody.summary = summary;
      if (description != null) requestBody.description = description;
      if (location != null) requestBody.location = location;
      if (attendees != null) requestBody.attendees = attendees;
      if (colorId != null) requestBody.colorId = colorId;
      if (reminders != null) requestBody.reminders = reminders;
      if (recurrence != null) requestBody.recurrence = recurrence;
      if (visibility != null) requestBody.visibility = visibility;
      if (transparency != null) requestBody.transparency = transparency;
      if (start != null) requestBody.start = start;
      if (end != null) requestBody.end = end;

      const response = await calendar.events.patch({
        calendarId,
        eventId,
        sendUpdates,
        requestBody,
      });

      return {
        id: response.data.id,
        summary: response.data.summary,
        start: response.data.start?.dateTime ?? response.data.start?.date,
        end: response.data.end?.dateTime ?? response.data.end?.date,
        htmlLink: response.data.htmlLink,
        status: response.data.status,
      };
    },
  });
}
