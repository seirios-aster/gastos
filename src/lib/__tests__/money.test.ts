import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { centsToInput, formatMoney, MAX_CENTS, parseAmountToCents } from '../money';

describe('parseAmountToCents', () => {
  it('parses what people type', () => {
    assert.equal(parseAmountToCents('12'), 1200);
    assert.equal(parseAmountToCents('12.5'), 1250);
    assert.equal(parseAmountToCents('12,50'), 1250);
    assert.equal(parseAmountToCents('1,234.50'), 123450);
    assert.equal(parseAmountToCents('.99'), 99);
    assert.equal(parseAmountToCents('0.1'), 10);
    assert.equal(parseAmountToCents('19.99'), 1999);
  });

  it('rejects zero, negatives and text', () => {
    assert.equal(parseAmountToCents('0'), null);
    assert.equal(parseAmountToCents(''), null);
    assert.equal(parseAmountToCents('abc'), null);
    assert.equal(parseAmountToCents('-5'), null);
    assert.equal(parseAmountToCents('1.2.3'), null);
  });

  it('accepts the largest amount and nothing above it', () => {
    assert.equal(parseAmountToCents('999999999.99'), MAX_CENTS);
    assert.equal(parseAmountToCents('1000000000'), null);
    assert.equal(parseAmountToCents('1000000000.00'), null);
  });

  it('rejects absurdly long input instead of returning an unsafe number', () => {
    assert.equal(parseAmountToCents('99999999999999999999'), null);
    assert.equal(parseAmountToCents('9'.repeat(400)), null);
    assert.ok(Number.isSafeInteger(MAX_CENTS * 1000));
  });
});

describe('formatMoney', () => {
  it('formats with and without a symbol', () => {
    assert.equal(formatMoney(1250, '$'), '$12.50');
    assert.equal(formatMoney(123456, ''), '1,234.56');
    assert.equal(formatMoney(5, '₱'), '₱0.05');
  });
});

describe('centsToInput', () => {
  it('gives a plain editable string', () => {
    assert.equal(centsToInput(1250), '12.50');
  });
});
