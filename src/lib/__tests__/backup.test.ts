import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseBackup, toBackupJson, type Backup, type Category, type Expense } from '../expenses';
import { MAX_CENTS } from '../money';
import type { Recurring } from '../recurring';

const t = new Date(2026, 9, 15, 12).getTime();
const categories: Category[] = [
  { id: 'food', label: 'Food', emoji: '🍔' },
  { id: 'c_pets', label: 'Pets', emoji: '🐶' },
];
const expenses: Expense[] = [
  { id: 2, title: 'Kibble, "big" bag', amountCents: 1999, category: 'c_pets', createdAt: t },
  { id: 1, title: '', amountCents: MAX_CENTS, category: 'food', createdAt: t - 86_400_000 },
];
const recurring: Recurring[] = [
  { id: 1, title: 'Rent', amountCents: 50000, category: 'food', frequency: 'monthly', day: 31, nextDue: t, paused: false },
  { id: 2, title: 'Gym', amountCents: 2000, category: 'food', frequency: 'weekly', day: 0, nextDue: t, paused: true },
];

const valid = (): Backup => JSON.parse(toBackupJson({ expenses, categories, recurring }, t));
const reject = (backup: unknown, pattern?: RegExp) => {
  const result = parseBackup(typeof backup === 'string' ? backup : JSON.stringify(backup));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.error.length > 0 && result.error.length < 80, result.error);
    if (pattern) assert.match(result.error, pattern);
  }
};

describe('backup round trip', () => {
  it('restores exactly what was exported', () => {
    const result = parseBackup(toBackupJson({ expenses, categories, recurring }, t));
    assert.ok(result.ok);
    assert.deepEqual(result.backup, { version: 1, exportedAt: t, categories, expenses, recurring });
  });

  it('handles an empty ledger and surrounding whitespace', () => {
    const json = toBackupJson({ expenses: [], categories: [], recurring: [] }, t);
    const result = parseBackup(`﻿ \n${json}\n`);
    assert.ok(result.ok);
    assert.deepEqual(result.backup.expenses, []);
  });

  it('keeps only the known fields', () => {
    const backup = valid();
    const result = parseBackup(
      JSON.stringify({
        ...backup,
        extra: 1,
        expenses: [{ ...expenses[0], note: 'x', ['__proto__']: { polluted: true } }],
      })
    );
    assert.ok(result.ok);
    assert.deepEqual(result.backup.expenses, [expenses[0]]);
    assert.equal(({} as Record<string, unknown>).polluted, undefined);
  });
});

describe('malformed backups', () => {
  it('rejects text that is not a backup', () => {
    reject('');
    reject('not json');
    reject('{"version":1');
    reject('null');
    reject('[]');
    reject('"backup"');
    reject('42');
  });

  it('rejects other versions', () => {
    reject({ ...valid(), version: 2 }, /version/);
    reject({ ...valid(), version: '1' }, /version/);
    const { version: _version, ...unversioned } = valid();
    reject(unversioned, /version/);
  });

  it('rejects a bad date or missing lists', () => {
    reject({ ...valid(), exportedAt: 'today' });
    reject({ ...valid(), exportedAt: 1e300 });
    reject({ ...valid(), exportedAt: null });
    for (const key of ['categories', 'expenses', 'recurring'] as const) {
      reject({ ...valid(), [key]: undefined });
      reject({ ...valid(), [key]: {} });
      reject({ ...valid(), [key]: 'x' });
    }
  });

  it('rejects bad amounts', () => {
    for (const amountCents of [0, -1, 1.5, MAX_CENTS + 1, 1e22, 2 ** 53, '100', null, true, [100]]) {
      reject({ ...valid(), expenses: [{ ...expenses[0], amountCents }] }, /expenses/);
      reject({ ...valid(), recurring: [{ ...recurring[0], amountCents }] }, /recurring/);
    }
    reject('{"version":1,"exportedAt":1,"categories":[],"recurring":[],"expenses":[{"id":1,"title":"","amountCents":1e999,"category":"food","createdAt":1}]}');
  });

  it('rejects bad timestamps and ids', () => {
    for (const createdAt of [null, '2026-10-15', 1.5, 1e300, Number.MAX_SAFE_INTEGER]) {
      reject({ ...valid(), expenses: [{ ...expenses[0], createdAt }] });
    }
    reject({ ...valid(), recurring: [{ ...recurring[0], nextDue: 'soon' }] });
    for (const id of [0, -1, 1.5, '1', null]) {
      reject({ ...valid(), expenses: [{ ...expenses[0], id }] });
    }
  });

  it('keeps paused items paused, and treats a backup without the flag as active', () => {
    const result = parseBackup(JSON.stringify(valid()));
    assert.ok(result.ok);
    assert.deepEqual(result.backup.recurring.map((r) => r.paused), [false, true]);

    // A backup made before pausing existed has no `paused` field on its recurring items.
    const old = valid();
    for (const item of old.recurring) delete (item as Partial<typeof item>).paused;
    const older = parseBackup(JSON.stringify(old));
    assert.ok(older.ok);
    assert.deepEqual(older.backup.recurring.map((r) => r.paused), [false, false]);

    reject({ ...valid(), recurring: [{ ...recurring[0], paused: 'yes' }] });
  });

  it('trims an over-long note instead of rejecting the whole backup', () => {
    const long = 'x'.repeat(5000);
    const result = parseBackup(
      JSON.stringify({
        ...valid(),
        expenses: [{ ...expenses[0], title: long }],
        recurring: [{ ...recurring[0], title: long }],
      })
    );
    assert.ok(result.ok);
    assert.equal(result.backup.expenses[0].title.length, 2000);
    assert.equal(result.backup.recurring[0].title.length, 2000);
  });

  it('rejects wrong field types and oversized text', () => {
    reject({ ...valid(), expenses: [{ ...expenses[0], title: 5 }] });
    reject({ ...valid(), expenses: [{ ...expenses[0], category: '' }] });
    reject({ ...valid(), expenses: [{ ...expenses[0], category: 'x'.repeat(101) }] });
    reject({ ...valid(), categories: [{ ...categories[0], label: 'x'.repeat(101) }] });
    reject({ ...valid(), categories: [{ ...categories[0], id: '' }] });
    reject({ ...valid(), categories: [{ ...categories[0], emoji: 7 }] });
    reject({ ...valid(), expenses: [null] });
    reject({ ...valid(), expenses: [[]] });
    reject({ ...valid(), expenses: ['x'] });
  });

  it('rejects bad recurring schedules', () => {
    reject({ ...valid(), recurring: [{ ...recurring[0], frequency: 'daily' }] });
    reject({ ...valid(), recurring: [{ ...recurring[0], day: 0 }] }); // monthly runs 1..31
    reject({ ...valid(), recurring: [{ ...recurring[0], day: 32 }] });
    reject({ ...valid(), recurring: [{ ...recurring[1], day: 7 }] }); // weekly runs 0..6
    reject({ ...valid(), recurring: [{ ...recurring[1], day: -1 }] });
    reject({ ...valid(), recurring: [{ ...recurring[1], day: 1.5 }] });
  });

  it('names the first bad entry', () => {
    reject({ ...valid(), expenses: [expenses[0], expenses[1], { ...expenses[1], amountCents: 0 }] }, /3/);
  });

  it('caps the number of rows', () => {
    const row = expenses[0];
    const full = Array.from({ length: 200_000 }, () => row);
    assert.ok(parseBackup(JSON.stringify({ ...valid(), expenses: full })).ok);
    reject({ ...valid(), expenses: [...full, row] }, /too many/);
    reject({ ...valid(), categories: Array.from({ length: 501 }, () => categories[0]) }, /too many/);
    reject({ ...valid(), recurring: Array.from({ length: 1001 }, () => recurring[0]) }, /too many/);
  });
});
