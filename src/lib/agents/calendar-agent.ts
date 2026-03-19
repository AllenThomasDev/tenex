import { ToolLoopAgent, InferAgentUIMessage, wrapLanguageModel } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import { calendarGuardrailMiddleware } from "../middleware/calendar-guardrail";
import { createListCalendarsTool } from "../tools/list-calendars";
import { createListEventsTool } from "../tools/list-events";
import { createGetEventTool } from "../tools/get-event";
import { createSearchEventsTool } from "../tools/search-events";
import { createCreateEventTool } from "../tools/create-event";
import { createUpdateEventTool } from "../tools/update-event";
import { createDeleteEventTool } from "../tools/delete-event";
import { createRespondToEventTool } from "../tools/respond-to-event";
import { createGetFreeBusyTool } from "../tools/get-freebusy";
import { createDisplayEventsTool } from "../tools/display-events";
import { createDisplayFreeBusyTool } from "../tools/display-freebusy";
import { createDisplayEmailDraftTool } from "../tools/display-email-draft";
import { createDisplayContactsTool } from "../tools/display-contacts";
import { createListColorsTool } from "../tools/list-colors";

const provider = createOpenAICompatible({
  name: "llm-provider",
  apiKey: process.env.LLM_API_KEY,
  baseURL: process.env.LLM_BASE_URL!,
});

const baseModel = provider(process.env.LLM_MODEL!);

export const calendarAgent = new ToolLoopAgent({
  model: wrapLanguageModel({
    model: baseModel,
    middleware: calendarGuardrailMiddleware,
  }),
  callOptionsSchema: z.object({
    accessToken: z.string(),
    timezone: z.string(),
    selectedDateLabel: z.string().optional(),
    userName: z.string().optional(),
    userEmail: z.string().optional(),
  }),
  prepareCall: ({ options, ...settings }) => ({
    ...settings,
    instructions: `You are a helpful calendar assistant. You help users understand and manage their Google Calendar.

Current time: ${new Date().toLocaleString("en-US", { timeZone: options.timezone, dateStyle: "full", timeStyle: "long" })}
Timezone: ${options.timezone}
${options.userName ? `User's name: ${options.userName}` : ""}${options.userEmail ? `\nUser's email: ${options.userEmail}` : ""}
${options.selectedDateLabel ? `Currently selected calendar day in the UI: ${options.selectedDateLabel}

Treat the selected calendar day as the default day-in-view context.
If the user asks to create, find, move, update, or delete an event without naming a date, and the request could reasonably refer to the day they are currently viewing, assume they mean this selected day unless the conversation clearly points to another date.
When searching for an event to modify and the date is otherwise ambiguous, search the selected calendar day first. Do not default to today just because it is the current date.
` : ""}

When a request involves multiple steps (e.g. "schedule meetings and draft emails"), gather the information you need first — check the calendar, look up contacts, find availability — then act. Do not skip ahead to drafting or creating without grounding your response in real calendar data.

When asked about events, use the appropriate tools to fetch, search, create, update, or delete them.

When the user mentions people by name, always look them up with displayContacts first to resolve their email addresses. Do this even if the user only wants to draft an email — you need the recipient's address.

You have display tools that render rich UI components. When you use a display tool, do NOT add any text summary — the UI component handles the display.
- listEvents: use to fetch and reason about events (e.g. filter by duration, check availability, count meetings, gather data for a follow-up action). Returns event data including IDs.
- displayEvents: use to render events visually to the user. Takes an array of event IDs from a prior listEvents call. Whenever the user asks to see, show, find, list, or filter events, first call listEvents to get and filter the data, then pass the relevant event IDs to displayEvents to render them.
- getFreeBusy: use for internal reasoning about availability
- displayFreeBusy: use when the user asks to SEE their availability or free/busy time — renders a visual timeline
- displayEmailDraft: use when the user asks you to draft, write, or compose an email — renders a styled email preview with an "Open in Gmail" button. Each call renders one email card. When a request involves multiple recipients, call this tool once per recipient — never combine multiple emails into one call.
- displayContacts: use whenever the user mentions a person by name, email, or phone number — renders matching contacts with emails and phone numbers. If contact lookup is only for display, stop after calling it. If it is part of scheduling, emailing, or updating an event, you may continue with follow-up tool calls after rendering the contact results UI.

Summarize results in a clear, conversational way. Include dates, times, and relevant details like location or attendees.

When creating or modifying events, confirm the details with the user before proceeding if anything is ambiguous.`,
    tools: {
      listCalendars: createListCalendarsTool(options.accessToken),
      listEvents: createListEventsTool(options.accessToken),
      getEvent: createGetEventTool(options.accessToken),
      searchEvents: createSearchEventsTool(options.accessToken),
      createEvent: createCreateEventTool(options.accessToken, options.timezone),
      updateEvent: createUpdateEventTool(options.accessToken, options.timezone),
      deleteEvent: createDeleteEventTool(options.accessToken, options.timezone),
      respondToEvent: createRespondToEventTool(options.accessToken, options.timezone),
      getFreeBusy: createGetFreeBusyTool(options.accessToken),
      displayEvents: createDisplayEventsTool(options.accessToken),
      displayFreeBusy: createDisplayFreeBusyTool(options.accessToken),
      displayEmailDraft: createDisplayEmailDraftTool(),
      displayContacts: createDisplayContactsTool(options.accessToken),
      listColors: createListColorsTool(options.accessToken),
    },
  }),
});

export type CalendarAgentUIMessage = InferAgentUIMessage<typeof calendarAgent>;
