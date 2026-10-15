import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { addDays, addMonths, dayKey, dayLabel, daysInMonth, isSameMonth, startOfDay } from '../dates';

const now = new Date(2026, 9, 15, 14, 30).getTime();

describe('dayLabel', () => {
  it('names today and yesterday', () => {
    assert.equal(dayLabel(now, now), 'Today');
    assert.equal(dayLabel(addDays(now, -1), now), 'Yesterday');
    assert.notEqual(dayLabel(addDays(now, -3), now), 'Yesterday');
  });
});

describe('dayKey', () => {
  it('is the local YYYY-MM-DD', () => {
    assert.equal(dayKey(now), '2026-10-15');
    assert.equal(dayKey(new Date(2026, 0, 5, 23, 59).getTime()), '2026-01-05');
    assert.equal(dayKey(addDays(new Date(2026, 9, 31, 10).getTime(), 1)), '2026-11-01');
  });
});

describe('months', () => {
  it('compares and moves by month', () => {
    assert.ok(isSameMonth(addMonths(now, 0), now));
    assert.ok(!isSameMonth(addMonths(now, -1), now));
    assert.equal(new Date(addMonths(new Date(2026, 11, 20).getTime(), 1)).getFullYear(), 2027);
  });

  it('knows leap years', () => {
    assert.equal(daysInMonth(new Date(2028, 1, 10).getTime()), 29);
    assert.equal(daysInMonth(new Date(2027, 1, 10).getTime()), 28);
  });
});

describe('startOfDay', () => {
  it('never moves forward', () => {
    assert.ok(startOfDay(now) <= now);
    assert.ok(startOfDay(addDays(now, 1)) > now);
  });
});
