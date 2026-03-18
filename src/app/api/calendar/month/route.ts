import { auth } from "@/auth";
import { google } from "googleapis";
import { headers } from "next/headers";
import { getLocalDateKey, getUtcBoundsForLocalMonth } from "@/lib/calendar-timezone";

type DayEvent = {
  id?: string | null;
  title: string;
  start?: string;
  end?: string;
  isAllDay: boolean;
  location?: string | null;
  attendeesCount: number;
  attendees: { email?: string; displayName?: string; responseStatus?: string; self?: boolean; optional?: boolean }[];
  status?: string | null;
  htmlLink?: string | null;
  description?: string | null;
  hangoutLink?: string | null;
  conferenceLink?: string | null;
  organizer?: { email?: string; displayName?: string; self?: boolean } | null;
  selfResponseStatus?: string | null;
  colorId?: string | null;
  recurringEventId?: string | null;
  visibility?: string | null;
};

function addEventToDay(days: Record<string, DayEvent[]>, day: string, event: DayEvent) {
  if (day in days) {
    days[day].push(event);
  }
}

export async function GET(request: Request) {
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

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month");
  const timeZone = searchParams.get("timeZone");

  const year = Number(yearParam);
  const month = Number(monthParam);

  if (
    !yearParam ||
    !monthParam ||
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    year < 1970
  ) {
    return Response.json(
      { error: "Valid year and month are required" },
      { status: 400 },
    );
  }

  if (!timeZone) {
    return Response.json(
      { error: "A valid time zone is required" },
      { status: 400 },
    );
  }

  const { startUtc, endUtc } = getUtcBoundsForLocalMonth(year, month, timeZone);

  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin: startUtc.toISOString(),
    timeMax: endUtc.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 2500,
  });

  // Pre-populate every calendar day in the month with an empty array
  const days: Record<string, DayEvent[]> = {};
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days[key] = [];
  }

  for (const event of response.data.items ?? []) {
    const start = event.start?.dateTime || event.start?.date || undefined;
    const end = event.end?.dateTime || event.end?.date || undefined;

    const selfAttendee = event.attendees?.find((a) => a.self);
    const conferenceUri = event.conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === "video",
    )?.uri;

    const mapped: DayEvent = {
      id: event.id,
      title: event.summary?.trim() || "Untitled event",
      start,
      end,
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

    if (mapped.isAllDay) {
      const startStr = event.start?.date;
      const endStr = event.end?.date;
      if (!startStr || !endStr) continue;

      const [sy, sm, sd] = startStr.split("-").map(Number);
      const [ey, em, ed] = endStr.split("-").map(Number);

      let cur = new Date(Date.UTC(sy, sm - 1, sd));
      const endDay = new Date(Date.UTC(ey, em - 1, ed));

      while (cur < endDay) {
        const key = `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, "0")}-${String(cur.getUTCDate()).padStart(2, "0")}`;
        addEventToDay(days, key, mapped);
        cur = new Date(cur.getTime() + 86_400_000);
      }
    } else {
      const startDateTime = event.start?.dateTime;
      const endDateTime = event.end?.dateTime;
      if (!startDateTime) continue;

      const startKey = getLocalDateKey(new Date(startDateTime), timeZone);
      const endKey = getLocalDateKey(
        new Date(new Date(endDateTime ?? startDateTime).getTime() - 1),
        timeZone,
      );

      let cur = new Date(`${startKey}T00:00:00.000Z`);
      const endDay = new Date(`${endKey}T00:00:00.000Z`);

      while (cur <= endDay) {
        const key = `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, "0")}-${String(cur.getUTCDate()).padStart(2, "0")}`;
        addEventToDay(days, key, mapped);
        cur = new Date(cur.getTime() + 86_400_000);
      }
    }
  }

  return Response.json({ year, month, days });
}
