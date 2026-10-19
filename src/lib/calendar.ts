import { daysInMonth, startOfDay } from './dates';

/** A month as weeks (Sunday first) of day numbers, with null for the empty cells before and after. */
export function monthWeeks(monthTs: number): (number | null)[][] {
  const first = new Date(monthTs);
  const lead = new Date(first.getFullYear(), first.getMonth(), 1).getDay();
  const cells: (number | null)[] = [
    ...new Array<null>(lead).fill(null),
    ...Array.from({ length: daysInMonth(monthTs) }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** The timestamp (midnight) of a day number in the month of `monthTs`. */
export function dayOfMonth(monthTs: number, day: number): number {
  const m = new Date(monthTs);
  return new Date(m.getFullYear(), m.getMonth(), day).getTime();
}

/** Only days before today can be picked: today has its own tab, and the future has nothing yet. */
export function isPickable(monthTs: number, day: number, now: number): boolean {
  return dayOfMonth(monthTs, day) < startOfDay(now);
}

/**
 * The day to show when a month opens: yesterday for the current month (null on the 1st, when
 * there is no earlier day in it), the last day for a month that is over, null for a future month.
 */
export function defaultDay(monthTs: number, now: number): number | null {
  const last = daysInMonth(monthTs);
  for (let day = last; day >= 1; day--) {
    if (isPickable(monthTs, day, now)) return day;
  }
  return null;
}
