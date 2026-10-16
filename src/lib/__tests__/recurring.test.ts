import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { addDays, startOfDay } from '../dates';
import {
  advance,
  describeReminder,
  describeSchedule,
  dueOccurrences,
  monthlyEquivalentCents,
  nextOccurrence,
  ordinal,
  reminderTimes,
  type Frequency,
} from '../recurring';

const d = (y: number, m: number, day: number, h = 12) => new Date(y, m - 1, day, h).getTime();
const wed = d(2026, 10, 14, 15); // Wed Oct 14 2026

describe('ordinal and describeSchedule', () => {
  it('writes ordinals', () => {
    assert.deepEqual(
      [1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal),
      ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd']
    );
  });

  it('describes schedules', () => {
    assert.equal(describeSchedule({ frequency: 'weekly', day: 1 }), 'Every Mon');
    assert.equal(describeSchedule({ frequency: 'monthly', day: 15 }), 'Monthly on the 15th');
  });
});

describe('nextOccurrence', () => {
  it('finds the next weekday', () => {
    assert.equal(new Date(wed).getDay(), 3);
    assert.equal(nextOccurrence('weekly', 3, wed), d(2026, 10, 14, 9)); // today (09:00, already past)
    assert.equal(nextOccurrence('weekly', 5, wed), d(2026, 10, 16, 9)); // Fri
    assert.equal(nextOccurrence('weekly', 2, wed), d(2026, 10, 20, 9)); // next Tue
  });

  it('finds the next day of the month and clamps short months', () => {
    assert.equal(nextOccurrence('monthly', 14, wed), d(2026, 10, 14, 9));
    assert.equal(nextOccurrence('monthly', 1, wed), d(2026, 11, 1, 9));
    assert.equal(nextOccurrence('monthly', 31, d(2026, 11, 2)), d(2026, 11, 30, 9));
    assert.equal(nextOccurrence('monthly', 31, d(2026, 12, 15)), d(2026, 12, 31, 9));
    assert.equal(nextOccurrence('monthly', 29, d(2027, 2, 1)), d(2027, 2, 28, 9)); // non-leap Feb
    assert.equal(nextOccurrence('monthly', 1, d(2026, 12, 20)), d(2027, 1, 1, 9)); // year wrap
  });
});

describe('advance', () => {
  it('moves to the following occurrence without the clamp sticking', () => {
    assert.equal(advance('monthly', 31, d(2026, 10, 31, 9)), d(2026, 11, 30, 9));
    assert.equal(advance('monthly', 31, d(2026, 11, 30, 9)), d(2026, 12, 31, 9));
    assert.equal(advance('weekly', 3, d(2026, 10, 14, 9)), d(2026, 10, 21, 9));
  });
});

describe('dueOccurrences', () => {
  it('catches up on everything missed while the app was closed', () => {
    const away = dueOccurrences({ frequency: 'monthly', day: 1, nextDue: d(2026, 8, 1, 9) }, d(2026, 10, 15));
    assert.deepEqual(away.dues, [d(2026, 8, 1, 9), d(2026, 9, 1, 9), d(2026, 10, 1, 9)]);
    assert.equal(away.next, d(2026, 11, 1, 9));

    const weeks = dueOccurrences({ frequency: 'weekly', day: 3, nextDue: d(2026, 9, 30, 9) }, d(2026, 10, 14, 15));
    assert.equal(weeks.dues.length, 3); // Sep 30, Oct 7, Oct 14
  });

  it('has nothing to log before the due day', () => {
    assert.equal(dueOccurrences({ frequency: 'weekly', day: 3, nextDue: d(2026, 10, 21, 9) }, wed).dues.length, 0);
    // tomorrow's item is not due yet, even a minute before midnight
    const tomorrow = { frequency: 'monthly', day: 17, nextDue: d(2026, 10, 17, 9) } as const;
    assert.equal(dueOccurrences(tomorrow, d(2026, 10, 16, 23)).dues.length, 0);
    // just after midnight on the due day it is due
    assert.equal(dueOccurrences(tomorrow, d(2026, 10, 17, 0)).dues.length, 1);
  });

  it('clamps day 31 across short months', () => {
    const run = dueOccurrences({ frequency: 'monthly', day: 31, nextDue: d(2026, 1, 31, 9) }, d(2026, 6, 15));
    assert.deepEqual(run.dues, [
      d(2026, 1, 31, 9),
      d(2026, 2, 28, 9),
      d(2026, 3, 31, 9),
      d(2026, 4, 30, 9),
      d(2026, 5, 31, 9),
    ]);
    assert.equal(run.next, d(2026, 6, 30, 9));
  });

  it('stamps an item set up for today before 9:00 with the current time', () => {
    const early = d(2026, 10, 16, 5);
    const dueToday = nextOccurrence('monthly', 16, early);
    assert.equal(dueToday, d(2026, 10, 16, 9));
    const run = dueOccurrences({ frequency: 'monthly', day: 16, nextDue: dueToday }, early);
    assert.deepEqual(run.dues, [early]); // logged now, not at a future 9:00
    assert.equal(run.next, d(2026, 11, 16, 9));
    // later the same day (after 9:00) keeps the real 9:00 timestamp
    assert.deepEqual(dueOccurrences({ frequency: 'monthly', day: 16, nextDue: dueToday }, d(2026, 10, 16, 15)).dues, [dueToday]);
  });

  describe('a backlog beyond the cap (wrong device clock)', () => {
    const cases: { frequency: Frequency; day: number; weekday?: number }[] = [
      { frequency: 'weekly', day: 0, weekday: 0 },
      { frequency: 'monthly', day: 15 },
    ];

    for (const { frequency, day, weekday } of cases) {
      it(`logs only the last year and moves ${frequency} items into the future`, () => {
        const run = dueOccurrences({ frequency, day, nextDue: 0 }, wed);
        const yearAgo = startOfDay(addDays(wed, -365));

        assert.ok(run.dues.length > 0 && run.dues.length <= 53);
        assert.ok(run.dues.every((due) => due >= yearAgo && due <= wed));
        assert.deepEqual(run.dues, [...run.dues].sort((a, b) => a - b));
        assert.equal(new Set(run.dues).size, run.dues.length);
        if (weekday !== undefined) {
          assert.ok(run.dues.every((due) => new Date(due).getDay() === weekday));
        }
        assert.ok(startOfDay(run.next) > startOfDay(wed));
        assert.equal(run.next, nextOccurrence(frequency, day, addDays(wed, 1)));
      });
    }

    it('ends at the most recent occurrence', () => {
      const weekly = dueOccurrences({ frequency: 'weekly', day: 0, nextDue: 0 }, wed);
      assert.equal(weekly.dues.at(-1), d(2026, 10, 11, 9));
      assert.equal(weekly.next, d(2026, 10, 18, 9));

      const monthly = dueOccurrences({ frequency: 'monthly', day: 15, nextDue: 0 }, wed);
      assert.equal(monthly.dues.at(-1), d(2026, 9, 15, 9));
      assert.equal(monthly.next, d(2026, 10, 15, 9));
    });

    it('still catches up fully when the backlog fits under the cap', () => {
      const run = dueOccurrences({ frequency: 'monthly', day: 1, nextDue: d(2022, 1, 1, 9) }, wed);
      assert.equal(run.dues.length, 58); // Jan 2022 to Oct 2026
      assert.equal(run.dues[0], d(2022, 1, 1, 9));
    });
  });
});

describe('monthlyEquivalentCents', () => {
  const item = (frequency: Frequency, amountCents: number, paused = false) => ({ frequency, amountCents, paused });

  it('adds up monthly items as they are', () => {
    assert.equal(monthlyEquivalentCents([item('monthly', 50000), item('monthly', 1299)]), 51299);
  });

  it('counts a weekly item as 52/12 payments a month', () => {
    assert.equal(monthlyEquivalentCents([item('weekly', 1200)]), 5200);
    assert.equal(monthlyEquivalentCents([item('weekly', 1000)]), 4333);
  });

  it('ignores paused items and handles an empty list', () => {
    assert.equal(monthlyEquivalentCents([item('monthly', 50000, true), item('weekly', 1200, true)]), 0);
    assert.equal(monthlyEquivalentCents([]), 0);
  });
});

describe('reminderTimes', () => {
  const monthly = { frequency: 'monthly' as Frequency, day: 15, paused: false };

  it('has none when off or paused', () => {
    assert.deepEqual(reminderTimes({ ...monthly, remindDays: null }, wed, 3), []);
    assert.deepEqual(reminderTimes({ ...monthly, remindDays: 0, paused: true }, wed, 3), []);
  });

  it('fires at 9:00 on the due day', () => {
    assert.deepEqual(reminderTimes({ ...monthly, remindDays: 0 }, wed, 3), [
      d(2026, 10, 15, 9),
      d(2026, 11, 15, 9),
      d(2026, 12, 15, 9),
    ]);
  });

  it('fires the day before at 9:00', () => {
    // Oct 14 at 9:00 is already past (it is 15:00), so the first one is next month's.
    assert.deepEqual(reminderTimes({ ...monthly, remindDays: 1 }, wed, 2), [
      d(2026, 11, 14, 9),
      d(2026, 12, 14, 9),
    ]);
    assert.deepEqual(reminderTimes({ ...monthly, remindDays: 1 }, d(2026, 10, 13, 20), 1), [d(2026, 10, 14, 9)]);
  });

  it('skips today when 9:00 has passed and keeps it when it has not', () => {
    const today = { ...monthly, day: 14, remindDays: 0 };
    assert.deepEqual(reminderTimes(today, d(2026, 10, 14, 15), 1), [d(2026, 11, 14, 9)]);
    assert.deepEqual(reminderTimes(today, d(2026, 10, 14, 8), 1), [d(2026, 10, 14, 9)]);
  });

  it('follows weekly items', () => {
    const weekly = { frequency: 'weekly' as Frequency, day: 1, paused: false, remindDays: 1 }; // Mondays
    assert.deepEqual(reminderTimes(weekly, wed, 2), [d(2026, 10, 18, 9), d(2026, 10, 25, 9)]); // Sundays
  });

  it('lands on the last day of short months', () => {
    const end = { frequency: 'monthly' as Frequency, day: 31, paused: false, remindDays: 1 };
    assert.deepEqual(reminderTimes(end, d(2026, 1, 20), 2), [d(2026, 1, 30, 9), d(2026, 2, 27, 9)]);
  });

  it('never returns more than asked for, and only future moments', () => {
    const times = reminderTimes({ ...monthly, remindDays: 7 }, wed, 12);
    assert.equal(times.length, 12);
    assert.ok(times.every((t) => t > wed));
    assert.deepEqual([...times].sort((a, b) => a - b), times);
  });
});

describe('describeReminder', () => {
  it('words each choice', () => {
    assert.equal(describeReminder(null), 'No reminder');
    assert.equal(describeReminder(0), 'Reminder on the day');
    assert.equal(describeReminder(1), 'Reminder 1 day before');
    assert.equal(describeReminder(3), 'Reminder 3 days before');
  });
});
