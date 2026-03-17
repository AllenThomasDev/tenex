import { auth } from "@/auth";
import { google } from "googleapis";
import { headers } from "next/headers";

const DATE_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function getUtcBoundsForLocalDate(date: string, offsetMinutes: number) {
  const [year, month, day] = date.split("-").map(Number);

  const startUtc = new Date(
    Date.UTC(year, month - 1, day, 0, 0, 0) + offsetMinutes * 60_000,
  );
  const endUtc = new Date(
    Date.UTC(year, month - 1, day + 1, 0, 0, 0) + offsetMinutes * 60_000,
  );

  return { startUtc, endUtc };
}

export async function GET(request: Request) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const account = await auth.api
    .getAccessToken({
      headers: requestHeaders,
      body: {
        providerId: "google",
        userId: session.user.id,
      },
    })
    .catch(() => null);

  if (!account?.accessToken) {
    return Response.json(
      { error: "No Google access token available" },
      { status: 401 },
    );
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: account.accessToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const offsetParam = searchParams.get("timeZoneOffset");

  if (!dateParam || !DATE_PARAM_PATTERN.test(dateParam)) {
    return Response.json(
      { error: "A valid date is required" },
      { status: 400 },
    );
  }

  const offsetMinutes = Number(offsetParam);

  if (!Number.isFinite(offsetMinutes)) {
    return Response.json(
      { error: "A valid timezone offset is required" },
      { status: 400 },
    );
  }

  const { startUtc, endUtc } = getUtcBoundsForLocalDate(dateParam, offsetMinutes);

  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin: startUtc.toISOString(),
    timeMax: endUtc.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 20,
  });

  const events = (response.data.items ?? []).map((event) => ({
    id: event.id,
    title: event.summary?.trim() || "Untitled event",
    start: event.start?.dateTime ?? event.start?.date,
    end: event.end?.dateTime ?? event.end?.date,
    isAllDay: Boolean(event.start?.date && !event.start?.dateTime),
    location: event.location,
    attendeesCount: event.attendees?.length ?? 0,
  }));

  return Response.json({ date: dateParam, events });
}
