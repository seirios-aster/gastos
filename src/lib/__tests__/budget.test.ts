import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { budgetStatus, dailyAllowanceCents, projectedMonthCents } from '../budget';

const d = (y: number, m: number, day: number, h = 12) => new Date(y, m - 1, day, h).getTime();

describe('budgetStatus', () => {
  it('turns from ok to warn to over', () => {
    assert.deepEqual(budgetStatus(5000, 10000), { ratio: 0.5, remainingCents: 5000, tone: 'ok' });
    assert.equal(budgetStatus(8000, 10000).tone, 'warn');
    assert.equal(budgetStatus(10000, 10000).tone, 'warn'); // exactly at budget is not "over"
    const over = budgetStatus(12000, 10000);
    assert.deepEqual([over.ratio, over.remainingCents, over.tone], [1, -2000, 'over']);
  });

  it('copes with no budget', () => {
    assert.equal(budgetStatus(0, 0).ratio, 0);
  });
});

describe('dailyAllowanceCents', () => {
  it('splits what is left over the days remaining, today included', () => {
    assert.equal(dailyAllowanceCents(31000, d(2026, 10, 1)), 1000);
    assert.equal(dailyAllowanceCents(1000, d(2026, 10, 31)), 1000);
    assert.equal(dailyAllowanceCents(-5, d(2026, 10, 10)), 0);
  });
});

describe('projectedMonthCents', () => {
  it('extrapolates the pace so far to the end of the month', () => {
    assert.equal(projectedMonthCents(10000, d(2026, 10, 10)), 31000);
    assert.equal(projectedMonthCents(10000, d(2026, 11, 10)), 30000);
    assert.equal(projectedMonthCents(10000, d(2028, 2, 10)), 29000);
  });

  it('rounds to whole cents', () => {
    assert.equal(projectedMonthCents(100, d(2026, 10, 3)), 1033);
  });

  it('waits for three days of data', () => {
    assert.equal(projectedMonthCents(10000, d(2026, 10, 1)), null);
    assert.equal(projectedMonthCents(10000, d(2026, 10, 2)), null);
    assert.notEqual(projectedMonthCents(10000, d(2026, 10, 3)), null);
  });

  it('has nothing to project without spending', () => {
    assert.equal(projectedMonthCents(0, d(2026, 10, 20)), null);
  });
});
