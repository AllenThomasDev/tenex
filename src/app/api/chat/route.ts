import { createAgentUIStreamResponse } from "ai";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { calendarAgent } from "@/lib/agents/calendar-agent";
import type { CalendarChatMessage, ReferredCalendarEvent } from "@/lib/chat-message";

function formatEventContext(events: ReferredCalendarEvent[]): string {
  return events
    .map((event) =>
      [
        `title: ${event.title}`,
        event.start ? `start: ${event.start}` : null,
        event.end ? `end: ${event.end}` : null,
        event.id ? `eventId: ${event.id}` : null,
        event.location ? `location: ${event.location}` : null,
      ]
        .filter(Boolean)
        .join(", "),
    )
    .map((details) => `[${details}]`)
    .join("\n");
}

function injectReferredEvents(
  messages: CalendarChatMessage[],
  events: ReferredCalendarEvent[],
): CalendarChatMessage[] {
  const lastUserIndex = messages.findLastIndex((m) => m.role === "user");
  if (lastUserIndex === -1) return messages;

  const message = messages[lastUserIndex];
  const context = `\n\n---\nReferenced events:\n${formatEventContext(events)}`;
  const updatedParts = message.parts.map((part) =>
    part.type === "text" ? { ...part, text: part.text + context } : part,
  );

  const resolved = [...messages];
  resolved[lastUserIndex] = { ...message, parts: updatedParts };
  return resolved;
}

export async function POST(req: Request) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  let accessToken: string;
  try {
    const account = await auth.api.getAccessToken({
      headers: requestHeaders,
      body: {
        providerId: "google",
        userId: session.user.id,
      },
    });
    accessToken = account.accessToken;
  } catch {
    return Response.json(
      { error: "No Google access token available" },
      { status: 401 },
    );
  }

  const { messages, timezone, selectedDateLabel } = (await req.json()) as {
    messages: CalendarChatMessage[]
    timezone?: string
    selectedDateLabel?: string
  }

  let resolvedMessages = messages;
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")
  const referredEvents = lastUserMessage?.metadata?.referredEvents

  if (Array.isArray(referredEvents) && referredEvents.length > 0) {
    resolvedMessages = injectReferredEvents(messages, referredEvents)
  }

  return createAgentUIStreamResponse({
    agent: calendarAgent,
    uiMessages: resolvedMessages,
    options: {
      accessToken,
      timezone: timezone ?? "America/Chicago",
      selectedDateLabel,
      userName: session.user.name ?? undefined,
      userEmail: session.user.email,
    },
  });
}
