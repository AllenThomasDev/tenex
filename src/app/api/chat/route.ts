import { createAgentUIStreamResponse } from "ai";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { calendarAgent } from "@/lib/agents/calendar-agent";

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

  const { messages, timezone } = await req.json();

  return createAgentUIStreamResponse({
    agent: calendarAgent,
    uiMessages: messages,
    options: {
      accessToken,
      timezone: timezone ?? "America/Chicago",
    },
  });
}
