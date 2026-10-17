import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DatabaseSync } from 'node:sqlite';

import type { SQLiteDatabase } from 'expo-sqlite';

import {
  deleteAllExpenseRows,
  deleteCategoryRow,
  deleteExpenseRow,
  deleteExpenseRows,
  deleteRecurringRow,
  deleteRecurringRows,
  importBackupRows,
  insertCategory,
  insertExpense,
  insertExpenses,
  insertRecurring,
  loadCategories,
  loadExpenses,
  loadRecurring,
  migrate,
  runDueRecurring,
  setRecurringPausedRow,
  updateExpenseRow,
  updateRecurringRow,
} from '../db';
import type { Backup } from '../expenses';

// Stand-in for expo-sqlite's SQLiteDatabase, backed by node:sqlite.
function makeDb(raw: DatabaseSync): SQLiteDatabase {
  let depth = 0;
  const fake = {
    execAsync: async (sql: string) => {
      raw.exec(sql);
    },
    getFirstAsync: async (sql: string, ...params: never[]) => raw.prepare(sql).get(...params.flat()) ?? null,
    getAllAsync: async (sql: string, ...params: never[]) => raw.prepare(sql).all(...params.flat()),
    runAsync: async (sql: string, ...params: never[]) => {
      const result = raw.prepare(sql).run(...params.flat());
      return { lastInsertRowId: Number(result.lastInsertRowid), changes: Number(result.changes) };
    },
    withTransactionAsync: async (task: () => Promise<void>) => {
      assert.equal(depth, 0, 'no nested transactions');
      depth++;
      raw.exec('BEGIN');
      try {
        await task();
        raw.exec('COMMIT');
      } catch (error) {
        raw.exec('ROLLBACK');
        throw error;
      } finally {
        depth--;
      }
    },
  };
  return fake as unknown as SQLiteDatabase;
}

const d = (y: number, m: number, day: number, h = 12) => new Date(y, m - 1, day, h).getTime();

async function freshDb() {
  const raw = new DatabaseSync(':memory:');
  const db = makeDb(raw);
  await migrate(db);
  return { raw, db };
}

describe('migrate', () => {
  it('upgrades an existing v1 database and keeps its data', async () => {
    const raw = new DatabaseSync(':memory:');
    raw.exec(`CREATE TABLE expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL DEFAULT '',
      amount_cents INTEGER NOT NULL, category TEXT NOT NULL DEFAULT 'other', created_at INTEGER NOT NULL);
      CREATE INDEX idx_expenses_created_at ON expenses(created_at);
      INSERT INTO expenses (title, amount_cents, category, created_at) VALUES ('Old coffee', 450, 'food', 1000);`);
    const db = makeDb(raw);
    await migrate(db);
    await migrate(db); // idempotent

    assert.equal((raw.prepare('PRAGMA user_version').get() as { user_version: number }).user_version, 4);
    const expenses = await loadExpenses(db);
    assert.equal(expenses.length, 1);
    assert.equal(expenses[0].title, 'Old coffee');
    const seeded = await loadCategories(db);
    assert.equal(seeded.length, 8);
    assert.equal(seeded[0].id, 'food');
    assert.equal(seeded[seeded.length - 1].id, 'other');
  });

  it('upgrades a v2 database to the latest schema without touching its recurring items', async () => {
    const raw = new DatabaseSync(':memory:');
    raw.exec(`CREATE TABLE expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL DEFAULT '',
      amount_cents INTEGER NOT NULL, category TEXT NOT NULL DEFAULT 'other', created_at INTEGER NOT NULL);
      CREATE TABLE categories (id TEXT PRIMARY KEY, label TEXT NOT NULL, emoji TEXT NOT NULL, sort INTEGER NOT NULL);
      CREATE TABLE recurring (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL DEFAULT '',
        amount_cents INTEGER NOT NULL, category TEXT NOT NULL DEFAULT 'other', frequency TEXT NOT NULL,
        day INTEGER NOT NULL, next_due INTEGER NOT NULL);
      INSERT INTO categories (id, label, emoji, sort) VALUES ('other', 'Other', '✨', 0);
      INSERT INTO recurring (title, amount_cents, category, frequency, day, next_due)
        VALUES ('Rent', 50000, 'other', 'monthly', 1, 5000);
      PRAGMA user_version = 2;`);
    const db = makeDb(raw);
    await migrate(db);
    await migrate(db); // idempotent

    assert.equal((raw.prepare('PRAGMA user_version').get() as { user_version: number }).user_version, 4);
    const [rent] = await loadRecurring(db);
    assert.equal(rent.title, 'Rent');
    assert.equal(rent.nextDue, 5000);
    assert.equal(rent.paused, false);
    assert.equal(rent.remindDays, null); // no reminder until the person asks for one
  });

  it('sets up a fresh install', async () => {
    const { db } = await freshDb();
    assert.deepEqual(await loadExpenses(db), []);
    assert.equal((await loadCategories(db)).length, 8);
  });
});

describe('expenses', () => {
  it('inserts, updates, reorders and deletes', async () => {
    const { db } = await freshDb();
    const t = d(2026, 10, 15);
    const a = await insertExpense(db, { title: 'Coffee', amountCents: 450, category: 'food', createdAt: t });
    const b = await insertExpense(db, { title: '', amountCents: 1999, category: 'transport', createdAt: t + 1000 });
    assert.deepEqual((await loadExpenses(db)).map((r) => r.id), [b, a]);
    await updateExpenseRow(db, a, { title: 'Latte', amountCents: 500, category: 'food', createdAt: t + 5000 });
    assert.deepEqual((await loadExpenses(db)).map((r) => r.id), [a, b]);
    await deleteExpenseRow(db, b);
    assert.equal((await loadExpenses(db)).length, 1);
  });

  it('deletes several at once and leaves the rest', async () => {
    const { db } = await freshDb();
    const t = d(2026, 10, 15);
    const ids: number[] = [];
    for (let i = 0; i < 5; i++) {
      ids.push(await insertExpense(db, { title: `E${i}`, amountCents: 100 + i, category: 'food', createdAt: t + i }));
    }
    await deleteExpenseRows(db, [ids[1], ids[3], 99999]); // an id that is already gone is fine
    assert.deepEqual((await loadExpenses(db)).map((r) => r.title).sort(), ['E0', 'E2', 'E4']);
    await deleteExpenseRows(db, []); // nothing picked: nothing happens
    assert.equal((await loadExpenses(db)).length, 3);
  });

  it('deletes more rows than one SQL statement can name', async () => {
    const { db } = await freshDb();
    const ids = await insertExpenses(
      db,
      Array.from({ length: 1000 }, (_, i) => ({ title: `E${i}`, amountCents: 100, category: 'food', createdAt: 1000 + i }))
    );
    await deleteExpenseRows(db, ids.slice(0, 950));
    assert.equal((await loadExpenses(db)).length, 50);
  });

  it('puts deleted expenses back with the same details and new ids', async () => {
    const { db } = await freshDb();
    const input = [
      { title: 'Rent', amountCents: 1500000, category: 'bills', createdAt: 5000 },
      { title: '', amountCents: 250, category: 'food', createdAt: 6000 },
    ];
    const ids = await insertExpenses(db, input);
    assert.equal(ids.length, 2);
    assert.notEqual(ids[0], ids[1]);
    await deleteExpenseRows(db, ids);
    assert.equal((await loadExpenses(db)).length, 0);
    const back = await insertExpenses(db, input);
    const rows = await loadExpenses(db);
    assert.deepEqual(rows.map(({ id: _id, ...rest }) => rest).sort((a, b) => a.createdAt - b.createdAt), input);
    assert.deepEqual(rows.map((r) => r.id).sort(), [...back].sort());
  });
});

describe('categories', () => {
  it('appends custom ones before Other and re-homes rows when one is deleted', async () => {
    const { db } = await freshDb();
    const t = d(2026, 10, 15);
    await insertCategory(db, { id: 'c_pets', label: 'Pets', emoji: '🐶' });
    await insertCategory(db, { id: 'c_gym', label: 'Gym', emoji: '🏋️' });
    let categories = await loadCategories(db);
    assert.deepEqual(
      categories.map((c) => c.id),
      ['food', 'groceries', 'transport', 'bills', 'shopping', 'health', 'fun', 'c_pets', 'c_gym', 'other']
    );
    await insertExpense(db, { title: 'Kibble', amountCents: 800, category: 'c_pets', createdAt: t });
    await insertRecurring(db, { title: 'Pet insurance', amountCents: 1500, category: 'c_pets', frequency: 'monthly', day: 1, remindDays: null }, t);

    await deleteCategoryRow(db, 'c_pets');
    categories = await loadCategories(db);
    assert.ok(!categories.some((c) => c.id === 'c_pets'));
    assert.equal((await loadExpenses(db)).find((e) => e.title === 'Kibble')!.category, 'other');
    assert.equal((await loadRecurring(db))[0].category, 'other');

    await deleteCategoryRow(db, 'other'); // protected
    assert.ok((await loadCategories(db)).some((c) => c.id === 'other'));
  });
});

describe('recurring', () => {
  it('catches up once and never logs twice', async () => {
    const { db } = await freshDb();
    const now = d(2026, 10, 14, 15); // Wed Oct 14, after 09:00
    await insertRecurring(db, { title: 'Rent', amountCents: 50000, category: 'bills', frequency: 'monthly', day: 1, remindDays: null }, d(2026, 8, 20));
    await insertRecurring(db, { title: 'Gym', amountCents: 2000, category: 'c_gym', frequency: 'weekly', day: 3, remindDays: null }, d(2026, 9, 30, 10));
    assert.equal((await loadRecurring(db)).length, 2);

    assert.equal(await runDueRecurring(db, d(2026, 8, 20)), false); // nothing due yet
    assert.equal(await runDueRecurring(db, now), true);
    const rows = await loadExpenses(db);
    const rent = rows.filter((e) => e.title === 'Rent');
    assert.deepEqual(rent.map((e) => e.createdAt).sort(), [d(2026, 9, 1, 9), d(2026, 10, 1, 9)]);
    assert.equal(rows.filter((e) => e.title === 'Gym').length, 3); // Sep 30, Oct 7, Oct 14
    assert.equal(rent[0].amountCents, 50000);
    const items = await loadRecurring(db);
    assert.equal(items.find((i) => i.title === 'Rent')!.nextDue, d(2026, 11, 1, 9));
    assert.equal(items.find((i) => i.title === 'Gym')!.nextDue, d(2026, 10, 21, 9));

    assert.equal(await runDueRecurring(db, now), false); // running again adds nothing
    assert.equal(await runDueRecurring(db, now + 3600_000), false);
    assert.equal((await loadExpenses(db)).length, rows.length);
    assert.equal(await runDueRecurring(db, d(2026, 10, 21, 10)), true); // next week's gym
    assert.equal((await loadExpenses(db)).filter((e) => e.title === 'Gym').length, 4);
  });

  it('logs an item added for today before 9:00 immediately, once', async () => {
    const { db } = await freshDb();
    const early = d(2026, 10, 16, 5);
    await insertRecurring(db, { title: 'Subscription', amountCents: 999, category: 'bills', frequency: 'monthly', day: 16, remindDays: null }, early);
    assert.equal(await runDueRecurring(db, early), true);
    const logged = await loadExpenses(db);
    assert.equal(logged.length, 1);
    assert.equal(logged[0].createdAt, early); // stamped now, not a future 9:00
    assert.equal(await runDueRecurring(db, d(2026, 10, 16, 10)), false); // no duplicate later that day
    assert.equal((await loadExpenses(db)).length, 1);
    assert.equal((await loadRecurring(db))[0].nextDue, d(2026, 11, 16, 9));
  });

  it('does not flood the ledger after a wrong clock', async () => {
    const { raw, db } = await freshDb();
    const now = d(2026, 10, 14, 15);
    await insertRecurring(db, { title: 'Gym', amountCents: 2000, category: 'bills', frequency: 'weekly', day: 0, remindDays: null }, now);
    raw.prepare('UPDATE recurring SET next_due = 0').run();

    assert.equal(await runDueRecurring(db, now), true);
    assert.ok((await loadExpenses(db)).length <= 53);
    assert.equal((await loadRecurring(db))[0].nextDue, d(2026, 10, 18, 9));
    assert.equal(await runDueRecurring(db, now), false);
  });

  it('deletes rules and clears expenses independently', async () => {
    const { db } = await freshDb();
    const t = d(2026, 10, 15);
    await insertExpense(db, { title: 'Coffee', amountCents: 450, category: 'food', createdAt: t });
    await insertRecurring(db, { title: 'Rent', amountCents: 50000, category: 'bills', frequency: 'monthly', day: 1, remindDays: null }, t);
    await deleteAllExpenseRows(db);
    assert.equal((await loadExpenses(db)).length, 0);
    assert.equal((await loadRecurring(db)).length, 1);
    await deleteRecurringRow(db, (await loadRecurring(db))[0].id);
    assert.equal((await loadRecurring(db)).length, 0);
  });
});

const backupOf = (parts: Partial<Backup>): Backup => ({
  version: 1,
  exportedAt: 0,
  categories: [],
  expenses: [],
  recurring: [],
  ...parts,
});

describe('deleting several recurring items', () => {
  const base = { amountCents: 1000, category: 'bills', frequency: 'monthly' as const, day: 5, remindDays: null };

  it('removes the chosen items and keeps the others', async () => {
    const { db } = await freshDb();
    const now = d(2026, 10, 16);
    for (const title of ['A', 'B', 'C']) await insertRecurring(db, { ...base, title }, now);
    const all = await loadRecurring(db);
    const byTitle = (t: string) => all.find((r) => r.title === t)!.id;
    await deleteRecurringRows(db, [byTitle('A'), byTitle('C')]);
    assert.deepEqual((await loadRecurring(db)).map((r) => r.title), ['B']);
    await deleteRecurringRows(db, []);
    assert.equal((await loadRecurring(db)).length, 1);
  });
});

describe('importBackupRows', () => {
  const now = d(2026, 10, 16, 14);
  const lunch = { id: 7, title: 'Lunch', amountCents: 1200, category: 'food', createdAt: d(2026, 10, 1) };

  it('adds what is missing, and importing the same backup again adds nothing', async () => {
    const { db } = await freshDb();
    const backup = backupOf({
      expenses: [lunch, { ...lunch, id: 8, title: 'Dinner', createdAt: d(2026, 10, 2) }],
    });
    assert.deepEqual(await importBackupRows(db, backup, now), { expenses: 2, categories: 0, recurring: 0 });
    assert.deepEqual(await importBackupRows(db, backup, now), { expenses: 0, categories: 0, recurring: 0 });
    assert.equal((await loadExpenses(db)).length, 2);
  });

  it('keeps existing category labels, sends unknown categories to Other, keeps Other last', async () => {
    const { db } = await freshDb();
    const backup = backupOf({
      categories: [
        { id: 'food', label: 'Renamed food', emoji: '🥗' },
        { id: 'c_pets', label: 'Pets', emoji: '🐶' },
      ],
      expenses: [
        { ...lunch, category: 'c_pets' },
        { ...lunch, id: 9, title: 'Mystery', category: 'c_gone' },
      ],
    });
    assert.deepEqual(await importBackupRows(db, backup, now), { expenses: 2, categories: 1, recurring: 0 });
    const categories = await loadCategories(db);
    assert.equal(categories.find((c) => c.id === 'food')?.label, 'Food');
    assert.equal(categories[categories.length - 1].id, 'other');
    assert.ok(categories.some((c) => c.id === 'c_pets'));
    const rows = await loadExpenses(db);
    assert.equal(rows.find((e) => e.title === 'Mystery')?.category, 'other');
    assert.equal(rows.find((e) => e.title === 'Lunch')?.category, 'c_pets');
  });

  it('keeps two identical rows from the same backup', async () => {
    const { db } = await freshDb();
    const backup = backupOf({ expenses: [lunch, { ...lunch, id: 8 }] });
    assert.equal((await importBackupRows(db, backup, now)).expenses, 2);
    assert.equal((await importBackupRows(db, backup, now)).expenses, 0);
    assert.equal((await loadExpenses(db)).length, 2);
  });

  it("does not log a recurring item twice when the old phone already logged today's", async () => {
    const { db } = await freshDb();
    const base = { id: 1, title: 'Rent', amountCents: 50000, category: 'bills', frequency: 'monthly' as const, day: 16, remindDays: null };
    // The old phone logged the 16th, so its next due date is already November.
    await importBackupRows(db, backupOf({ recurring: [{ ...base, nextDue: d(2026, 11, 16, 9) }] }), now);
    const [moved] = await loadRecurring(db);
    assert.equal(moved.nextDue, d(2026, 11, 16, 9));
    assert.equal(await runDueRecurring(db, now), false);

    // A backup taken before today's expense was logged still gets it logged.
    const other = await freshDb();
    await importBackupRows(other.db, backupOf({ recurring: [{ ...base, nextDue: d(2026, 10, 16, 9) }] }), now);
    assert.equal((await loadRecurring(other.db))[0].nextDue, d(2026, 10, 16, 9));
    assert.equal(await runDueRecurring(other.db, now), true);
  });

  it('rolls everything back when a row cannot be saved', async () => {
    const { db } = await freshDb();
    const broken = { ...lunch, createdAt: null } as unknown as typeof lunch;
    const backup = backupOf({
      categories: [{ id: 'c_pets', label: 'Pets', emoji: '🐶' }],
      expenses: [lunch, broken],
    });
    await assert.rejects(importBackupRows(db, backup, now));
    assert.equal((await loadExpenses(db)).length, 0);
    assert.ok(!(await loadCategories(db)).some((c) => c.id === 'c_pets'));
  });
});

describe('updateRecurringRow', () => {
  const now = d(2026, 10, 16, 14);
  const input = { title: 'Gym', amountCents: 2000, category: 'other', frequency: 'weekly' as const, day: 1, remindDays: null };

  it('keeps the schedule when only the amount, note or category change', async () => {
    const { db } = await freshDb();
    await insertRecurring(db, input, now);
    const [before] = await loadRecurring(db);
    await updateRecurringRow(db, before.id, { ...input, title: 'Climbing', amountCents: 2500, category: 'fun' }, now + 86_400_000);
    const [after] = await loadRecurring(db);
    assert.equal(after.title, 'Climbing');
    assert.equal(after.amountCents, 2500);
    assert.equal(after.category, 'fun');
    assert.equal(after.nextDue, before.nextDue);
  });

  it('recomputes the next due date when the frequency or day changes', async () => {
    const { db } = await freshDb();
    await insertRecurring(db, input, now);
    const [before] = await loadRecurring(db);
    await updateRecurringRow(db, before.id, { ...input, frequency: 'monthly', day: 20 }, now);
    const [after] = await loadRecurring(db);
    assert.equal(after.frequency, 'monthly');
    assert.equal(after.day, 20);
    assert.equal(after.nextDue, d(2026, 10, 20, 9));
  });
});

describe('recurring reminders', () => {
  const now = d(2026, 10, 16, 14);
  const rent = { title: 'Rent', amountCents: 50000, category: 'bills', frequency: 'monthly' as const, day: 20, remindDays: 1 };

  it('saves the reminder and loads it back', async () => {
    const { db } = await freshDb();
    await insertRecurring(db, rent, now);
    assert.equal((await loadRecurring(db))[0].remindDays, 1);
  });

  it('changes or clears the reminder without moving the due date', async () => {
    const { db } = await freshDb();
    await insertRecurring(db, rent, now);
    const [before] = await loadRecurring(db);
    await updateRecurringRow(db, before.id, { ...rent, remindDays: 0 }, now);
    assert.equal((await loadRecurring(db))[0].remindDays, 0);
    await updateRecurringRow(db, before.id, { ...rent, remindDays: null }, now);
    const [after] = await loadRecurring(db);
    assert.equal(after.remindDays, null);
    assert.equal(after.nextDue, before.nextDue);
  });

  it('survives a backup restore and pausing', async () => {
    const { db } = await freshDb();
    await importBackupRows(db, backupOf({ recurring: [{ id: 1, ...rent, nextDue: d(2026, 10, 20, 9), paused: false }] }), now);
    const [item] = await loadRecurring(db);
    assert.equal(item.remindDays, 1);
    await setRecurringPausedRow(db, item.id, true, now);
    await setRecurringPausedRow(db, item.id, false, now);
    assert.equal((await loadRecurring(db))[0].remindDays, 1);
  });
});

describe('pausing recurring items', () => {
  const monthly = { title: 'Rent', amountCents: 50000, category: 'bills', frequency: 'monthly' as const, day: 1, remindDays: null };

  it('logs nothing while paused', async () => {
    const { db } = await freshDb();
    await insertRecurring(db, monthly, d(2026, 8, 20));
    const [item] = await loadRecurring(db);
    assert.equal(item.paused, false);
    await setRecurringPausedRow(db, item.id, true, d(2026, 8, 25));
    assert.equal((await loadRecurring(db))[0].paused, true);
    assert.equal(await runDueRecurring(db, d(2026, 11, 20)), false); // months pass, nothing is logged
    assert.equal((await loadExpenses(db)).length, 0);
  });

  it('resumes from the next due date without back-logging the paused months', async () => {
    const { db } = await freshDb();
    await insertRecurring(db, monthly, d(2026, 8, 20));
    const [item] = await loadRecurring(db);
    await setRecurringPausedRow(db, item.id, true, d(2026, 8, 25));

    const resumedOn = d(2026, 11, 20);
    await setRecurringPausedRow(db, item.id, false, resumedOn);
    const [resumed] = await loadRecurring(db);
    assert.equal(resumed.paused, false);
    assert.equal(resumed.nextDue, d(2026, 12, 1, 9));
    assert.equal(await runDueRecurring(db, resumedOn), false);       // the paused Sep-Nov are gone
    assert.equal(await runDueRecurring(db, d(2026, 12, 1, 10)), true);
    assert.equal((await loadExpenses(db)).length, 1);
  });

  it('logs right away when resumed on its due day', async () => {
    const { db } = await freshDb();
    await insertRecurring(db, monthly, d(2026, 8, 20));
    const [item] = await loadRecurring(db);
    await setRecurringPausedRow(db, item.id, true, d(2026, 8, 25));
    const dueDay = d(2026, 12, 1, 15);
    await setRecurringPausedRow(db, item.id, false, dueDay);
    assert.equal(await runDueRecurring(db, dueDay), true);
  });

  it('carries the paused flag through a restore', async () => {
    const { db } = await freshDb();
    const now = d(2026, 10, 16, 14);
    await importBackupRows(
      db,
      backupOf({ recurring: [{ id: 1, ...monthly, nextDue: d(2026, 11, 1, 9), paused: true }] }),
      now
    );
    assert.equal((await loadRecurring(db))[0].paused, true);
  });

  it('ignores an unknown id', async () => {
    const { db } = await freshDb();
    await setRecurringPausedRow(db, 999, false, d(2026, 10, 16));
    await setRecurringPausedRow(db, 999, true, d(2026, 10, 16));
    assert.deepEqual(await loadRecurring(db), []);
  });
});
