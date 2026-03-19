import type { LanguageModelV3Middleware } from "@ai-sdk/provider";
import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const classifierModel = createOpenAICompatible({
  name: "llm-provider",
  apiKey: process.env.LLM_API_KEY,
  baseURL: process.env.LLM_BASE_URL!,
})(process.env.LLM_GUARDRAIL_MODEL!);

function getLastUserMessageText(
  prompt: Parameters<
    NonNullable<LanguageModelV3Middleware["transformParams"]>
  >[0]["params"]["prompt"],
): string | null {
  for (let i = prompt.length - 1; i >= 0; i--) {
    const message = prompt[i];
    if (message.role !== "user") continue;

    for (const part of message.content) {
      if (part.type === "text") return part.text;
    }
  }
  return null;
}

const REFUSAL =
  "I'm a calendar assistant — I can help with scheduling, events, availability, meetings, and drafting event-related emails. Could you rephrase your request in terms of your calendar?";

/**
 * Middleware that blocks non-calendar-related queries before they reach the LLM.
 * Uses a fast, cheap model to classify intent, then either lets the request
 * through or forces a refusal response.
 */
export const calendarGuardrailMiddleware: LanguageModelV3Middleware = {
  specificationVersion: "v3",
  transformParams: async ({ params }) => {
    const userText = getLastUserMessageText(params.prompt);

    // Nothing to guard if there's no user text (e.g. tool result steps)
    if (!userText) return params;

    const { text } = await generateText({
      model: classifierModel,
      prompt: `You are a classifier. Decide if the user message below is related to any of these topics: calendar, scheduling, events, meetings, availability, time management, reminders, drafting emails or messages about events, or asking what this assistant can do.

Be lenient. If the message could plausibly be part of a calendar workflow, answer YES.

Answer only YES or NO.

User message: "${userText}"`,
    });

    const answer = text.trim().toUpperCase();

    if (answer.startsWith("YES")) {
      return params;
    }

    // Force the model to output the refusal by putting it in the conversation
    return {
      ...params,
      prompt: [
        {
          role: "user" as const,
          content: [{ type: "text" as const, text: userText }],
        },
        {
          role: "assistant" as const,
          content: [
            {
              type: "text" as const,
              text: REFUSAL,
            },
          ],
        },
      ],
    };
  },
};
