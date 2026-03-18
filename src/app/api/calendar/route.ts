import { getCalendarClient, mapEvent } from "@/lib/calendar-api";

export async function GET(request: Request) {
  const result = await getCalendarClient();
  if ("error" in result) return result.error;

  const { searchParams } = new URL(request.url);
  const timeMin = searchParams.get("timeMin");
  const timeMax = searchParams.get("timeMax");

  if (!timeMin || !timeMax) {
    return Response.json(
      { error: "timeMin and timeMax are required" },
      { status: 400 },
    );
  }

  const response = await result.calendar.events.list({
    calendarId: "primary",
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 2500,
  });

  return Response.json({
    events: (response.data.items ?? []).map(mapEvent),
  });
}

export async function PATCH(request: Request) {
  const result = await getCalendarClient();
  if ("error" in result) return result.error;

  const body = (await request.json()) as {
    eventId?: string;
    description?: string | null;
  };

  if (!body.eventId) {
    return Response.json({ error: "eventId is required" }, { status: 400 });
  }

  const response = await result.calendar.events.patch({
    calendarId: "primary",
    eventId: body.eventId,
    sendUpdates: "none",
    requestBody: {
      description: body.description ?? "",
    },
  });

  return Response.json({
    event: mapEvent(response.data),
  });
}
