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
      summary: z.string().optional().describe("Updated title of the event"),
      description: z.string().optional().describe("Updated description/notes"),
      start: z
        .string()
        .optional()
        .describe("Updated start time (ISO 8601)"),
      end: z
        .string()
        .optional()
        .describe("Updated end time (ISO 8601)"),
      timeZone: z
        .string()
        .optional()
        .describe("IANA timezone (e.g., 'America/Los_Angeles')"),
      location: z.string().optional().describe("Updated location"),
      attendees: z
        .array(
          z.object({
            email: z.string().describe("Email address of the attendee"),
          }),
        )
        .optional()
        .describe("Updated attendee list"),
      colorId: z.string().optional().describe("Updated color ID"),
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
        .describe("Updated reminder settings"),
      recurrence: z
        .array(z.string())
        .optional()
        .describe("Updated recurrence rules in RFC5545 format"),
      visibility: z
        .enum(["default", "public", "private", "confidential"])
        .optional()
        .describe("Visibility of the event"),
      transparency: z
        .enum(["opaque", "transparent"])
        .optional()
        .describe("Whether the event blocks time"),
      sendUpdates: z
        .enum(["all", "externalOnly", "none"])
        .default("all")
        .describe("Whether to send update notifications"),
    }),
    execute: async ({
      calendarId,
      eventId,
      summary,
      description,
      start,
      end,
      timeZone,
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
      if (summary !== undefined) requestBody.summary = summary;
      if (description !== undefined) requestBody.description = description;
      if (location !== undefined) requestBody.location = location;
      if (attendees !== undefined) requestBody.attendees = attendees;
      if (colorId !== undefined) requestBody.colorId = colorId;
      if (reminders !== undefined) requestBody.reminders = reminders;
      if (recurrence !== undefined) requestBody.recurrence = recurrence;
      if (visibility !== undefined) requestBody.visibility = visibility;
      if (transparency !== undefined) requestBody.transparency = transparency;

      if (start !== undefined) {
        const isAllDay = /^\d{4}-\d{2}-\d{2}$/.test(start);
        requestBody.start = isAllDay
          ? { date: start }
          : { dateTime: start, timeZone };
      }
      if (end !== undefined) {
        const isAllDay = /^\d{4}-\d{2}-\d{2}$/.test(end);
        requestBody.end = isAllDay
          ? { date: end }
          : { dateTime: end, timeZone };
      }

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
