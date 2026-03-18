import { getCalendarClient } from "@/lib/calendar-api";

export async function GET() {
  const result = await getCalendarClient();
  if ("error" in result) return result.error;

  const response = await result.calendar.calendarList.list();

  const calendars = (response.data.items ?? []).map((cal) => ({
    id: cal.id,
    summary: cal.summary,
    primary: cal.primary ?? false,
    backgroundColor: cal.backgroundColor,
    foregroundColor: cal.foregroundColor,
  }));

  return Response.json({ calendars });
}
