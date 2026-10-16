import { addDays, daysBetween, startOfDay } from './dates';

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

/** The short form for a list row: "Every Mon" or "Monthly · 17th". The long form is for screen readers. */
export function shortSchedule(item: Pick<Recurring, 'frequency' | 'day'>): string {
  return item.frequency === 'weekly'
    ? `Every ${WEEKDAYS[item.day]}`
    : `Monthly · ${ordinal(item.day)}`;
}

/** What the active items cost in a typical month (a weekly item counts as 52/12 payments a month). */
export function monthlyEquivalentCents(
  items: readonly Pick<Recurring, 'frequency' | 'amountCents' | 'paused'>[]
): number {
  const total = items
    .filter((item) => !item.paused)
    .reduce((sum, item) => sum + (item.frequency === 'weekly' ? (item.amountCents * 52) / 12 : item.amountCents), 0);
  return Math.round(total);
}

type Timed = Pick<Recurring, 'frequency' | 'day' | 'nextDue' | 'paused'>;

/** One future charge: which item, and when (ms, 9:00 local on the due day). */
export type Upcoming<T> = { item: T; due: number };

/** Active items first with the soonest due at the top; paused ones sink to the bottom. */
export function sortRecurring<T extends Pick<Recurring, 'id' | 'paused' | 'nextDue'>>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => Number(a.paused) - Number(b.paused) || a.nextDue - b.nextDue || a.id - b.id);
}

/**
 * Every charge that falls from today through the next `days` calendar days (today counts as day 1),
 * soonest first. Paused items have none. It starts from each item's own `nextDue`, so it agrees
 * with what auto-logging will do; a `nextDue` already in the past (about to be logged, or a clock
 * that moved) restarts from the first occurrence on or after today instead.
 */
export function upcomingOccurrences<T extends Timed>(items: readonly T[], now: number, days = 30): Upcoming<T>[] {
  const end = addDays(startOfDay(now), days);
  const found: (Upcoming<T> & { index: number })[] = [];
  items.forEach((item, index) => {
    if (item.paused) return;
    let due =
      startOfDay(item.nextDue) >= startOfDay(now)
        ? item.nextDue
        : nextOccurrence(item.frequency, item.day, now);
    // One charge a day at most, so `days` rounds is always enough.
    for (let i = 0; i <= days && due < end; i++) {
      found.push({ item, due, index });
      due = advance(item.frequency, item.day, due);
    }
  });
  found.sort((a, b) => a.due - b.due || a.index - b.index);
  return found.map(({ item, due }) => ({ item, due }));
}

/** Money leaving on each of the next `days` days (index 0 is today): the bars of a timeline chart. */
export function upcomingDailyTotals(
  items: readonly (Timed & Pick<Recurring, 'amountCents'>)[],
  now: number,
  days = 30
): number[] {
  const totals = new Array<number>(days).fill(0);
  for (const { item, due } of upcomingOccurrences(items, now, days)) {
    totals[daysBetween(now, due)] += item.amountCents;
  }
  return totals;
}

export type RecurringSummary<T> = {
  active: number;
  paused: number;
  /** About what the active items cost in a typical month. */
  monthlyCents: number;
  /** What actually leaves in the next `days` days. */
  upcomingCents: number;
  /** The very next charge, even when it is further away than `days`; null when nothing is active. */
  next: Upcoming<T> | null;
  /** Active items that have a reminder. */
  reminders: number;
};

/** The numbers at the top of the Recurring screen. */
export function summarizeRecurring<T extends Timed & Pick<Recurring, 'amountCents' | 'remindDays'>>(
  items: readonly T[],
  now: number,
  days = 30
): RecurringSummary<T> {
  const active = items.filter((item) => !item.paused);
  // A monthly item on the 31st can be 31 days between charges (Dec 31 -> Jan 31), so look 32 days ahead for "next".
  const ahead = upcomingOccurrences(items, now, Math.max(days, 32));
  return {
    active: active.length,
    paused: items.length - active.length,
    monthlyCents: monthlyEquivalentCents(items),
    upcomingCents: ahead
      .filter(({ due }) => daysBetween(now, due) < days)
      .reduce((sum, { item }) => sum + item.amountCents, 0),
    next: ahead[0] ?? null,
    reminders: active.filter((item) => item.remindDays !== null).length,
  };
}

/**
 * How many active items come due from today through `days` days ahead. Anything already due is
 * logged the moment the app opens, so this counts what is coming up, never what is overdue. It is
 * the number on the Recurring tab's badge.
 */
export function dueSoonCount(
  items: readonly Pick<Recurring, 'nextDue' | 'paused'>[],
  now: number,
  days: number
): number {
  const horizon = startOfDay(addDays(now, days + 1)); // the first moment after the window
  return items.filter((item) => !item.paused && item.nextDue < horizon).length;
}
