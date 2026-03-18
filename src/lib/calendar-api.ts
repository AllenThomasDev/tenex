import { auth } from "@/auth";
import { google, type calendar_v3 } from "googleapis";
import { headers } from "next/headers";

const EVENT_COLORS: Record<string, { background: string; foreground: string }> = {
  "1":  { background: "#a4bdfc", foreground: "#1d1d1d" },
  "2":  { background: "#7ae7bf", foreground: "#1d1d1d" },
  "3":  { background: "#dbadff", foreground: "#1d1d1d" },
  "4":  { background: "#ff887c", foreground: "#1d1d1d" },
  "5":  { background: "#fbd75b", foreground: "#1d1d1d" },
  "6":  { background: "#ffb878", foreground: "#1d1d1d" },
  "7":  { background: "#46d6db", foreground: "#1d1d1d" },
  "8":  { background: "#e1e1e1", foreground: "#1d1d1d" },
  "9":  { background: "#5484ed", foreground: "#1d1d1d" },
  "10": { background: "#51b749", foreground: "#1d1d1d" },
  "11": { background: "#dc2127", foreground: "#ffffff" },
};

export function mapEvent(event: calendar_v3.Schema$Event) {
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
    color: event.colorId ? EVENT_COLORS[event.colorId] ?? null : null,
    recurringEventId: event.recurringEventId,
    visibility: event.visibility,
  };
}

export type MappedEvent = ReturnType<typeof mapEvent>;

export async function getCalendarClient() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    return { error: Response.json({ error: "Not authenticated" }, { status: 401 }) } as const;
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
    return { error: Response.json({ error: "No Google access token available" }, { status: 401 }) } as const;
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  return {
    calendar: google.calendar({ version: "v3", auth: oauth2Client }),
    accessToken,
  } as const;
}
