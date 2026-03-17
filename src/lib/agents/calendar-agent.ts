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
import { createGetCurrentTimeTool } from "../tools/get-current-time";
import { createListColorsTool } from "../tools/list-colors";

const primeIntellect = createOpenAICompatible({
  name: "prime-intellect",
  apiKey: process.env.PRIME_INTELLECT_API_KEY,
  baseURL: "https://api.pinference.ai/api/v1",
});

export const calendarAgent = new ToolLoopAgent({
  model: primeIntellect("openai/gpt-5.4"),
  instructions: `You are a helpful calendar assistant. You help users understand and manage their Google Calendar.

When asked about events, use the appropriate tools to fetch, search, create, update, or delete them. Always call getCurrentTime first if you need to know today's date.

Summarize results in a clear, conversational way. Include dates, times, and relevant details like location or attendees.

When creating or modifying events, confirm the details with the user before proceeding if anything is ambiguous.`,
  callOptionsSchema: z.object({
    accessToken: z.string(),
  }),
  prepareCall: ({ options, ...settings }) => ({
    ...settings,
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
      getCurrentTime: createGetCurrentTimeTool(options.accessToken),
      listColors: createListColorsTool(options.accessToken),
    },
  }),
});

export type CalendarAgentUIMessage = InferAgentUIMessage<typeof calendarAgent>;
