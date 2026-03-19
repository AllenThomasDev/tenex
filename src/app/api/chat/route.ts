import { createAgentUIStreamResponse, type UIMessage } from "ai";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { calendarAgent } from "@/lib/agents/calendar-agent";

const EVENT_REF_PATTERN = /#(\d{2})\b/g;

type CalendarEvent = {
  id?: string;
  title: string;
  start?: string;
  end?: string;
  isAllDay: boolean;
  location?: string;
};

async function fetchDayEvents(
  dayKey: string,
  cookie: string,
): Promise<CalendarEvent[]> {
  const url = new URL(dayKey, "http://localhost");
  const res = await fetch(`http://localhost:${process.env.PORT ?? 3000}${url.pathname}${url.search}`, {
    headers: { cookie },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.events ?? [];
}

function resolveEventRefs(
  messages: UIMessage[],
  events: CalendarEvent[],
): UIMessage[] {
  if (events.length === 0) return messages;

  // Only resolve in the last user message
  const lastUserIndex = messages.findLastIndex((m) => m.role === "user");
  if (lastUserIndex === -1) return messages;

  const message = messages[lastUserIndex];
  const resolvedParts = message.parts.map((part) => {
    if (part.type !== "text") return part;
    const resolved = part.text.replace(
      EVENT_REF_PATTERN,
      (token, numStr: string) => {
        const index = parseInt(numStr, 10) - 1;
        if (index < 0 || index >= events.length) return token;
        const event = events[index];
        const details = [
          `title: ${event.title}`,
          event.start ? `start: ${event.start}` : null,
          event.end ? `end: ${event.end}` : null,
          event.id ? `eventId: ${event.id}` : null,
          event.location ? `location: ${event.location}` : null,
        ]
          .filter(Boolean)
          .join(", ");
        return `[${details}]`;
      },
    );
    return { ...part, text: resolved };
  });

  const resolved = [...messages];
  resolved[lastUserIndex] = { ...message, parts: resolvedParts };
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

  const { messages, timezone, dayKey } = await req.json();
  const cookie = requestHeaders.get("cookie") ?? "";

  // Resolve #0N event references in user messages
  let resolvedMessages = messages;
  if (dayKey && EVENT_REF_PATTERN.test(JSON.stringify(messages))) {
    const events = await fetchDayEvents(dayKey, cookie);
    resolvedMessages = resolveEventRefs(messages, events);
  }

  return createAgentUIStreamResponse({
    agent: calendarAgent,
    uiMessages: resolvedMessages,
    options: {
      accessToken,
      timezone: timezone ?? "America/Chicago",
    },
  });
}
