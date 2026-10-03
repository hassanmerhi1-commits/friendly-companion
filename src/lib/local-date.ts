/**
 * Calendar date helpers that never use UTC (Date#toISOString).
 * Using toISOString().slice(0,10) in Angola (UTC+1) shifts local midnight
 * back one calendar day — that made Sep payroll end_date = 29 instead of 30
 * and skipped deductions dated on the last day of the month.
 */

/** Format a Date as YYYY-MM-DD in the local timezone. */
export function formatLocalYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** First and last calendar day of a month (1–12), as local YYYY-MM-DD. */
export function getCalendarMonthBounds(
  year: number,
  month: number
): { startDate: string; endDate: string } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    startDate: formatLocalYmd(start),
    endDate: formatLocalYmd(end),
  };
}

/** Today's date as local YYYY-MM-DD. */
export function todayLocalYmd(): string {
  return formatLocalYmd(new Date());
}