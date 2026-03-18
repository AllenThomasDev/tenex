const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse a time input string into a Google Calendar API time object.
 *
 * Accepts:
 *  - ISO 8601 datetime: "2025-03-18T16:50:00-05:00" → { dateTime: "..." }
 *  - Date only:         "2025-03-18"                 → { date: "..." }
 *  - JSON object:       '{"dateTime":"...","timeZone":"America/Chicago"}' → passed through
 */
export function parseTimeInput(
  input: string,
): { dateTime?: string; date?: string; timeZone?: string } {
  const trimmed = input.trim();

  // JSON object format (for per-field timezone)
  if (trimmed.startsWith("{")) {
    const obj = JSON.parse(trimmed);
    const result: Record<string, string> = {};
    if (obj.dateTime) result.dateTime = obj.dateTime;
    if (obj.date) result.date = obj.date;
    if (obj.timeZone) result.timeZone = obj.timeZone;
    return result;
  }

  // All-day date
  if (ISO_DATE_ONLY.test(trimmed)) {
    return { date: trimmed };
  }

  // ISO 8601 datetime
  return { dateTime: trimmed };
}
