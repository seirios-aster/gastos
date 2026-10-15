import { addDays, startOfDay } from './dates';

export type Frequency = 'weekly' | 'monthly';

export type Recurring = {
  id: number;
  title: string;
  amountCents: number;
  category: string;
  frequency: Frequency;
  /** Weekly: 0 (Sunday) to 6 (Saturday). Monthly: 1 to 31 (clamped to the month's last day). */
  day: number;
  /** When the next expense should be logged (ms). */
  nextDue: number;
};

export type RecurringInput = Omit<Recurring, 'id' | 'nextDue'>;

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Recurring expenses are logged at 9:00 local time on their due day. */
const DUE_HOUR = 9;

function dueTimeOn(year: number, month: number, date: number): number {
  return new Date(year, month, date, DUE_HOUR).getTime();
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** First due moment on or after the calendar day of `from`. */
export function nextOccurrence(frequency: Frequency, day: number, from: number): number {
  const start = new Date(startOfDay(from));

  if (frequency === 'weekly') {
    const delta = (day - start.getDay() + 7) % 7;
    return dueTimeOn(start.getFullYear(), start.getMonth(), start.getDate() + delta);
  }

  for (let offset = 0; offset < 2; offset++) {
    const first = new Date(start.getFullYear(), start.getMonth() + offset, 1);
    const date = Math.min(day, lastDayOfMonth(first.getFullYear(), first.getMonth()));
    const candidate = new Date(first.getFullYear(), first.getMonth(), date);
    if (candidate.getTime() >= start.getTime()) {
      return dueTimeOn(candidate.getFullYear(), candidate.getMonth(), candidate.getDate());
    }
  }
  return dueTimeOn(start.getFullYear(), start.getMonth() + 1, 1);
}

/** The occurrence after `due`. */
export function advance(frequency: Frequency, day: number, due: number): number {
  return nextOccurrence(frequency, day, addDays(startOfDay(due), 1));
}

/**
 * Every occurrence that has come due by `now` (e.g. if the app wasn't opened for a few weeks),
 * and the next one still in the future. Capped so bad data can never loop forever.
 */
export function dueOccurrences(
  item: Pick<Recurring, 'frequency' | 'day' | 'nextDue'>,
  now: number,
  limit = 400
): { dues: number[]; next: number } {
  const dues: number[] = [];
  let next = item.nextDue;
  while (next <= now && dues.length < limit) {
    dues.push(next);
    next = advance(item.frequency, item.day, next);
  }
  return { dues, next };
}

export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;
}

export function describeSchedule(item: Pick<Recurring, 'frequency' | 'day'>): string {
  return item.frequency === 'weekly'
    ? `Every ${WEEKDAYS[item.day]}`
    : `Monthly on the ${ordinal(item.day)}`;
}
