const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Move by whole calendar days (DST-safe), keeping the time of day. */
export function addDays(ts: number, days: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

/** Whole calendar days from `from` to `to`: 0 the same day, 1 the next day, negative if `to` is earlier. */
export function daysBetween(from: number, to: number): number {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);
}

export function startOfMonth(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

export function addMonths(ts: number, months: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth() + months, 1).getTime();
}

export function isSameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b);
}

export function isSameMonth(a: number, b: number): boolean {
  return startOfMonth(a) === startOfMonth(b);
}

/** Local-time "YYYY-MM-DD", used to group expenses by day. */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** "Today", "Yesterday", or e.g. "Wed, Oct 14". */
export function dayLabel(ts: number, now: number): string {
  const diff = Math.round((startOfDay(now) - startOfDay(ts)) / DAY_MS);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** What a coming date is called: "Today", "Tomorrow", "In 5 days" up to six days out, then e.g. "Oct 24". */
export function dueLabel(ts: number, now: number): string {
  const days = daysBetween(now, ts);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days <= 6) return `In ${days} days`;
  return shortDateLabel(ts);
}

export function longDateLabel(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function timeLabel(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function monthLabel(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function daysInMonth(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** "Oct 4" */
export function shortDateLabel(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** "Oct" */
export function shortMonthLabel(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short' });
}
