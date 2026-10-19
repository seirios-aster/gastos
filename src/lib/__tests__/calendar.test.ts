import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { defaultDay, isPickable, monthWeeks } from '../calendar';

const d = (y: number, m: number, day: number, h = 12) => new Date(y, m - 1, day, h).getTime();

describe('monthWeeks', () => {
  it('starts on a Sunday, pads with empty cells and covers every day once', () => {
    // October 2026 starts on a Thursday and has 31 days.
    const weeks = monthWeeks(d(2026, 10, 1));
    assert.deepEqual(weeks[0], [null, null, null, null, 1, 2, 3]);
    assert.equal(weeks.length, 5);
    assert.ok(weeks.every((w) => w.length === 7));
    const days = weeks.flat().filter((x): x is number => x !== null);
    assert.deepEqual(days, Array.from({ length: 31 }, (_, i) => i + 1));
  });

  it('needs no padding when the month fits exactly', () => {
    // February 2026 starts on a Sunday and has 28 days.
    const weeks = monthWeeks(d(2026, 2, 1));
    assert.equal(weeks.length, 4);
    assert.equal(weeks[0][0], 1);
    assert.equal(weeks[3][6], 28);
  });

  it('can need six weeks', () => {
    // August 2026 starts on a Saturday and has 31 days.
    assert.equal(monthWeeks(d(2026, 8, 1)).length, 6);
  });
});

describe('picking days', () => {
  const now = d(2026, 10, 20, 15);
  const october = d(2026, 10, 1);

  it('allows only days before today', () => {
    assert.equal(isPickable(october, 19, now), true);
    assert.equal(isPickable(october, 20, now), false);
    assert.equal(isPickable(october, 21, now), false);
    assert.equal(isPickable(d(2026, 9, 1), 30, now), true);
  });

  it('opens on yesterday this month, and not on the 1st', () => {
    assert.equal(defaultDay(october, now), 19);
    assert.equal(defaultDay(october, d(2026, 10, 1, 8)), null);
  });

  it('opens on the last day of a finished month and nothing in a future month', () => {
    assert.equal(defaultDay(d(2026, 9, 1), now), 30);
    assert.equal(defaultDay(d(2026, 11, 1), now), null);
  });
});
