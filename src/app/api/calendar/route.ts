import { auth } from "@/auth";
import { google } from "googleapis";
import { headers } from "next/headers";
import { getUtcBoundsForLocalDate } from "@/lib/calendar-timezone";

const DATE_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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
  const timeZone = searchParams.get("timeZone");

  if (!dateParam || !DATE_PARAM_PATTERN.test(dateParam)) {
    return Response.json(
      { error: "A valid date is required" },
      { status: 400 },
    );
  }

  if (!timeZone) {
    return Response.json(
      { error: "A valid time zone is required" },
      { status: 400 },
    );
  }

  const { startUtc, endUtc } = getUtcBoundsForLocalDate(dateParam, timeZone);

  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin: startUtc.toISOString(),
    timeMax: endUtc.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 20,
  });

  const events = (response.data.items ?? []).map((event) => {
    const selfAttendee = event.attendees?.find((a) => a.self);
    const conferenceUri = event.conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === "video",
    )?.uri;

    return {
      id: event.id,
      title: event.summary?.trim() || "Untitled event",
      start: event.start?.dateTime ?? event.start?.date,
      end: event.end?.dateTime ?? event.end?.date,
      isAllDay: Boolean(event.start?.date && !event.start?.dateTime),
      location: event.location,
      attendeesCount: event.attendees?.length ?? 0,
      attendees: (event.attendees ?? []).map((a) => ({
        email: a.email ?? undefined,
        displayName: a.displayName ?? undefined,
        responseStatus: a.responseStatus ?? undefined,
        self: a.self ?? undefined,
        optional: a.optional ?? undefined,
      })),
      status: event.status,
      htmlLink: event.htmlLink,
      description: event.description,
      hangoutLink: event.hangoutLink,
      conferenceLink: conferenceUri ?? event.hangoutLink,
      organizer: event.organizer
        ? {
            email: event.organizer.email ?? undefined,
            displayName: event.organizer.displayName ?? undefined,
            self: event.organizer.self ?? undefined,
          }
        : null,
      selfResponseStatus: selfAttendee?.responseStatus,
      colorId: event.colorId,
      recurringEventId: event.recurringEventId,
      visibility: event.visibility,
    };
  });

  return Response.json({ date: dateParam, events });
}
