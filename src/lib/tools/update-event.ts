import { tool } from "ai";
import { z } from "zod";
import { getAffectedDayKeysForEvent } from "@/lib/calendar-day";
import { createCalendarClient } from "./google-calendar";
import { parseTimeInput } from "./parse-time-input";

function normalizeOptionalString(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function createUpdateEventTool(accessToken: string, userTimeZone: string) {
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
        .string()
        .optional()
        .describe(
          "Updated start time. Use ISO 8601: '2025-03-18T16:50:00-05:00' for timed events, '2025-03-18' for all-day events."
        ),
      end: z
        .string()
        .optional()
        .describe(
          "Updated end time. Use ISO 8601: '2025-03-18T17:00:00-05:00' for timed events, '2025-03-19' for all-day (exclusive)."
        ),
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
      const existing = await calendar.events.get({ calendarId, eventId });

      const requestBody: Record<string, unknown> = {};
      if (summary != null) requestBody.summary = summary;
      if (description != null) requestBody.description = description;
      if (location != null) requestBody.location = location;
      if (attendees != null) requestBody.attendees = attendees;
      if (colorId != null) requestBody.colorId = normalizeOptionalString(colorId);
      if (reminders != null) requestBody.reminders = reminders;
      if (recurrence != null) requestBody.recurrence = recurrence;
      if (visibility != null) requestBody.visibility = visibility;
      if (transparency != null) requestBody.transparency = transparency;
      if (start != null) requestBody.start = parseTimeInput(start);
      if (end != null) requestBody.end = parseTimeInput(end);

      try {
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
          affectedDayKeys: Array.from(
            new Set([
              ...getAffectedDayKeysForEvent(existing.data, userTimeZone),
              ...getAffectedDayKeysForEvent(response.data, userTimeZone),
            ]),
          ),
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
          `Failed to update event: ${details || message}.`
        );
      }
    },
  });
}
