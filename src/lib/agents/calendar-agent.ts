import { ToolLoopAgent, InferAgentUIMessage } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import { createListEventsTool } from "../tools/list-events";

const primeIntellect = createOpenAICompatible({
  name: "prime-intellect",
  apiKey: process.env.PRIME_INTELLECT_API_KEY,
  baseURL: "https://api.pinference.ai/api/v1",
});

export const calendarAgent = new ToolLoopAgent({
  model: primeIntellect("openai/gpt-5.4"),
  instructions: `You are a helpful calendar assistant. You help users understand and manage their Google Calendar.

When asked about upcoming events, use the listEvents tool to fetch them, then summarize the results in a clear, conversational way. Include dates, times, and any relevant details like location or attendees.`,
  callOptionsSchema: z.object({
    accessToken: z.string(),
  }),
  prepareCall: ({ options, ...settings }) => ({
    ...settings,
    tools: {
      listEvents: createListEventsTool(options.accessToken),
    },
  }),
});

export type CalendarAgentUIMessage = InferAgentUIMessage<typeof calendarAgent>;
