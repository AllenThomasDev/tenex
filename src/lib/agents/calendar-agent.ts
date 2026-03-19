import { ToolLoopAgent, InferAgentUIMessage } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
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

const primeIntellect = createOpenAICompatible({
  name: "prime-intellect",
  apiKey: process.env.PRIME_INTELLECT_API_KEY,
  baseURL: "https://api.pinference.ai/api/v1",
});

export const calendarAgent = new ToolLoopAgent({
  model: primeIntellect("openai/gpt-5.4"),
  callOptionsSchema: z.object({
    accessToken: z.string(),
    timezone: z.string(),
  }),
  prepareCall: ({ options, ...settings }) => ({
    ...settings,
    instructions: `You are a helpful calendar assistant. You help users understand and manage their Google Calendar.

Current time: ${new Date().toLocaleString("en-US", { timeZone: options.timezone, dateStyle: "full", timeStyle: "long" })}
Timezone: ${options.timezone}

When asked about events, use the appropriate tools to fetch, search, create, update, or delete them.
Use displayContacts whenever you search for a person by name, email, or phone number. Always show the contact results UI before using a found email to create or update an event.

You have display tools that render rich UI components. When you use a display tool, do NOT add any text summary — the UI component handles the display.
- listEvents: use for internal reasoning (e.g. checking availability, counting meetings, analyzing schedule)
- displayEvents: use when the user explicitly asks to SEE or SHOW their events — renders a visual event list
- getFreeBusy: use for internal reasoning about availability
- displayFreeBusy: use when the user asks to SEE their availability or free/busy time — renders a visual timeline
- displayEmailDraft: use when the user asks you to draft, write, or compose an email — renders a styled email preview with an "Open in Gmail" button
- displayContacts: use whenever you look up contacts — renders matching contacts with emails and phone numbers. If contact lookup is only for display, stop after calling it. If it is part of scheduling or updating an event, you may continue with follow-up tool calls after rendering the contact results UI.

Summarize results in a clear, conversational way. Include dates, times, and relevant details like location or attendees.

When creating or modifying events, confirm the details with the user before proceeding if anything is ambiguous.`,
    tools: {
      listCalendars: createListCalendarsTool(options.accessToken),
      listEvents: createListEventsTool(options.accessToken),
      getEvent: createGetEventTool(options.accessToken),
      searchEvents: createSearchEventsTool(options.accessToken),
      createEvent: createCreateEventTool(options.accessToken),
      updateEvent: createUpdateEventTool(options.accessToken),
      deleteEvent: createDeleteEventTool(options.accessToken),
      respondToEvent: createRespondToEventTool(options.accessToken),
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
