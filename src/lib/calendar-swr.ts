import type { SWRConfiguration } from "swr";

export const CALENDAR_DAY_SWR_OPTIONS: SWRConfiguration = {
  dedupingInterval: 60_000,
  focusThrottleInterval: 60_000,
  keepPreviousData: true,
};

export const MONTH_PREFETCH_TTL_MS = 5 * 60_000;

export function getCalendarMonthPrefetchKey(monthKey: string, timeZone: string) {
  return `calendar-month-prefetch:${timeZone}:${monthKey}`;
}
