// lib/sx-dates.ts
// Calendar-day helpers on "YYYY-MM-DD" keys. Days are Vietnam days
// (Asia/Ho_Chi_Minh); arithmetic is done in UTC so it is timezone-safe.

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** YYYY-MM-DD of an instant, in Vietnam time. */
export function vnDayKey(instant: string | number | Date): string {
  return dayFormatter.format(new Date(instant));
}

/** Today's YYYY-MM-DD in Vietnam time. */
export function vnTodayKey(): string {
  return vnDayKey(Date.now());
}

function toUtc(key: string): Date {
  return new Date(`${key}T00:00:00Z`);
}

export function addDays(key: string, days: number): string {
  const d = toUtc(key);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayMon0(key: string): number {
  return (toUtc(key).getUTCDay() + 6) % 7;
}

/** Monday of the week containing `key`. */
export function mondayOf(key: string): string {
  return addDays(key, -weekdayMon0(key));
}

/** "DD/MM" label of a day key. */
export function dayMonthLabel(key: string): string {
  return `${key.slice(8, 10)}/${key.slice(5, 7)}`;
}
