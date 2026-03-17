import { auth } from "@/auth";
import { google } from "googleapis";
import { headers } from "next/headers";

export async function GET() {
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

  const now = new Date();
  const oneWeekFromNow = new Date(now);
  oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin: now.toISOString(),
    timeMax: oneWeekFromNow.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 20,
  });

  const events = (response.data.items ?? []).map((event) => ({
    id: event.id,
    summary: event.summary,
    start: event.start?.dateTime ?? event.start?.date,
    end: event.end?.dateTime ?? event.end?.date,
    location: event.location,
    attendees: event.attendees?.map((a) => a.email),
  }));

  return Response.json({ events });
}
