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
  /** A paused item logs nothing; resuming restarts from the next due date after that day. */
  paused: boolean;
  /** Days before the due day to send a reminder (0 = on the day); null means no reminder. */
  remindDays: number | null;
};

export type RecurringInput = Omit<Recurring, 'id' | 'nextDue' | 'paused'>;

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

/** Past this many days, a backlog is a wrong device clock rather than bills that really went unlogged. */
const BACKLOG_DAYS = 365;

function collectDues(
  frequency: Frequency,
  day: number,
  from: number,
  now: number,
  limit: number
): { dues: number[]; next: number } {
  const dues: number[] = [];
  let next = from;
  while (startOfDay(next) <= startOfDay(now) && dues.length < limit) {
    dues.push(Math.min(next, now));
    next = advance(frequency, day, next);
  }
  return { dues, next };
}

/**
 * Every occurrence whose day has arrived by `now` (e.g. if the app wasn't opened for a few weeks),
 * and the next one still in the future. An item is due from the start of its day, whatever the
 * time, so one set up for today shows up right away. Today's entry is stamped with the current
 * time rather than a later 9:00. If more than `limit` are due, only the last year is logged and the
 * rest are skipped, so a wrong clock can't flood the ledger with hundreds of rows.
 */
export function dueOccurrences(
  item: Pick<Recurring, 'frequency' | 'day' | 'nextDue'>,
  now: number,
  limit = 400
): { dues: number[]; next: number } {
  const { frequency, day } = item;
  const result = collectDues(frequency, day, item.nextDue, now, limit);
  if (startOfDay(result.next) <= startOfDay(now)) {
    const recent = nextOccurrence(frequency, day, addDays(now, -BACKLOG_DAYS));
    return collectDues(frequency, day, recent, now, limit);
  }
  return result;
}

/** The reminder choices offered in the form, as days before the due day. */
export const REMINDER_CHOICES = [
  { days: null, label: 'Off' },
  { days: 0, label: 'On the day' },
  { days: 1, label: 'Day before' },
] as const;

/** Furthest ahead a reminder can be set; also the most a backup file may claim. */
export const MAX_REMIND_DAYS = 7;

export function describeReminder(remindDays: number | null): string {
  if (remindDays === null) return 'No reminder';
  if (remindDays === 0) return 'Reminder on the day';
  return `Reminder ${remindDays} ${remindDays === 1 ? 'day' : 'days'} before`;
}

/**
 * The next `count` moments (ms) a reminder should fire for this item, all at 9:00 local time and
 * all still in the future. Paused items and items without a reminder have none. Only reminders
 * after `now` are listed, so one whose moment already passed today waits for the next occurrence.
 */
export function reminderTimes(
  item: Pick<Recurring, 'frequency' | 'day' | 'remindDays' | 'paused'>,
  now: number,
  count: number
): number[] {
  if (item.paused || item.remindDays === null) return [];
  const times: number[] = [];
  let due = nextOccurrence(item.frequency, item.day, now);
  // A reminder a few days ahead can already be past for the first occurrence, so look a little further.
  for (let i = 0; i < count + MAX_REMIND_DAYS + 2 && times.length < count; i++) {
    const remindAt = new Date(due);
    remindAt.setDate(remindAt.getDate() - item.remindDays);
    if (remindAt.getTime() > now) times.push(remindAt.getTime());
    due = advance(item.frequency, item.day, due);
  }
  return times;
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

/** What the active items cost in a typical month (a weekly item counts as 52/12 payments a month). */
export function monthlyEquivalentCents(
  items: Pick<Recurring, 'frequency' | 'amountCents' | 'paused'>[]
): number {
  const total = items
    .filter((item) => !item.paused)
    .reduce((sum, item) => sum + (item.frequency === 'weekly' ? (item.amountCents * 52) / 12 : item.amountCents), 0);
  return Math.round(total);
}
