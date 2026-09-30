import type { TripInput } from '@/types/trip';

/**
 * Converts a native datetime-local string into the three numeric fields the backend expects.
 * day_of_week_num maps Monday=0 ... Sunday=6, matching Python's datetime.dayofweek convention.
 *
 * Example: "2026-01-07T14:30" (a Wednesday) → { hour: 14, day_of_week_num: 2, month: 1, year: 2000}
 */
export function decomposeDateTime(
  value: string
): Pick<TripInput, 'hour' | 'day_of_week_num' | 'month' | 'year'> {
  const date = new Date(value);

  const hour = date.getHours(); // 0-23
  const month = date.getMonth() + 1; // 1-12 (JS months are 0-indexed)
  const year = date.getFullYear(); // 2000

  // JS getDay(): 0=Sun, 1=Mon, ..., 6=Sat
  // Python dayofweek: 0=Mon, ..., 6=Sun
  // Mapping: (jsDay + 6) % 7
  const jsDay = date.getDay();
  const day_of_week_num = (jsDay + 6) % 7;

  return { hour, day_of_week_num, month, year };
}

/**
 * Inverse of decomposeDateTime: builds a datetime-local string FROM the four numeric fields,
 * i.e. the first `dayOfWeekNum` weekday of `month`/`year` at `hour`:00.
 *
 * Uses local-time getters/formatting (NOT Date#toISOString) so that
 * decomposeDateTime(composeDateTime(...)) always round-trips to the same four numbers in any
 * timezone — the datetime input can therefore never disagree with the fields it was built from.
 *
 * Example: (2026, 1, 2, 14) -> "2026-01-07T14:00" (a Wednesday, Mon=0 ... Sun=6)
 */
export function composeDateTime(
  year: number,
  month: number,
  dayOfWeekNum: number,
  hour: number
): string {
  const date = new Date(year, month - 1, 1, hour, 0, 0, 0);
  const targetJsDay = (dayOfWeekNum + 1) % 7;
  const offset = (targetJsDay - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + offset);

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:00`;
}
