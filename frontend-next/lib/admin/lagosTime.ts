/**
 * Date and time helpers for the admin pickers. Schedules are chosen in Lagos time (Africa/Lagos, West Africa Time),
 * which is UTC+01:00 all year with no daylight saving, so a fixed offset converts exactly whatever the browser's zone.
 */

export const LAGOS_OFFSET_MINUTES = 60;
const MINUTE = 60_000;

/** A calendar day and a time of day, as seen on a wall clock in Lagos. */
export type LagosParts = { year: number; month: number; day: number; hour: number; minute: number };
/** A calendar day (month is 0-based, like `Date`). */
export type CalendarDay = { year: number; month: number; day: number };

export const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
export const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** ISO string (or Date) to Lagos wall-clock parts; null when empty or invalid. */
export const toLagosParts = (value: string | Date | null | undefined): LagosParts | null => {
  if (!value) return null;
  const time = (value instanceof Date ? value : new Date(value)).getTime();
  if (Number.isNaN(time)) return null;
  const shifted = new Date(time + LAGOS_OFFSET_MINUTES * MINUTE);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
};

/** Lagos wall-clock parts to an ISO string (UTC). */
export const fromLagosParts = ({ year, month, day, hour, minute }: LagosParts) =>
  new Date(Date.UTC(year, month, day, hour, minute) - LAGOS_OFFSET_MINUTES * MINUTE).toISOString();

/** Today in Lagos. */
export const lagosToday = (now: Date = new Date()): CalendarDay => {
  const parts = toLagosParts(now) as LagosParts;
  return { year: parts.year, month: parts.month, day: parts.day };
};

/** Days since the epoch for a calendar day (for comparisons and weekday maths). */
export const dayNumber = ({ year, month, day }: CalendarDay) => Math.floor(Date.UTC(year, month, day) / 86_400_000);

export const fromDayNumber = (value: number): CalendarDay => {
  const date = new Date(value * 86_400_000);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate() };
};

/** 0 = Sunday. */
export const weekdayOf = (day: CalendarDay) => new Date(Date.UTC(day.year, day.month, day.day)).getUTCDay();

export const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

export const sameDay = (a: CalendarDay | null, b: CalendarDay | null) =>
  Boolean(a && b && a.year === b.year && a.month === b.month && a.day === b.day);

/** Adds months, clamping the day to the target month's length. */
export const addMonths = (day: CalendarDay, count: number): CalendarDay => {
  const index = day.year * 12 + day.month + count;
  const year = Math.floor(index / 12);
  const month = index - year * 12;
  return { year, month, day: Math.min(day.day, daysInMonth(year, month)) };
};

/** "10:30 AM" from minutes after midnight. */
export const timeLabel = (minutes: number) => {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
};

/** "Thu 18 Sep 2026" */
export const dayLabel = (day: CalendarDay) =>
  `${WEEKDAYS_SHORT[weekdayOf(day)]} ${day.day} ${MONTHS_SHORT[day.month]} ${day.year}`;

/** "Thursday 18 September 2026", for screen readers. */
export const longDayLabel = (day: CalendarDay) =>
  `${WEEKDAYS_LONG[weekdayOf(day)]} ${day.day} ${MONTHS_LONG[day.month]} ${day.year}`;

/** "Thu 18 Sep 2026, 10:30 AM" in Lagos time, or "" when empty or invalid. */
export const formatLagosDateTime = (value: string | null | undefined) => {
  const parts = toLagosParts(value);
  return parts ? `${dayLabel(parts)}, ${timeLabel(parts.hour * 60 + parts.minute)}` : "";
};

/** "2 h 30 min", "45 min", "3 h"; "" when empty. */
export const formatDuration = (minutes: number | null | undefined) => {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return "";
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes - hours * 60);
  if (!hours) return `${rest} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
};
