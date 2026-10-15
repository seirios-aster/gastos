import type { SQLiteDatabase } from 'expo-sqlite';

import {
  DEFAULT_CATEGORIES,
  OTHER_CATEGORY_ID,
  type Category,
  type Expense,
  type ExpenseInput,
} from './expenses';
import {
  dueOccurrences,
  nextOccurrence,
  type Frequency,
  type Recurring,
  type RecurringInput,
} from './recurring';

/** Bump this and add a `version < N` block in `migrate` whenever the schema changes. */
const SCHEMA_VERSION = 2;

type ExpenseRow = {
  id: number;
  title: string;
  amount_cents: number;
  category: string;
  created_at: number;
};

type CategoryRow = { id: string; label: string; emoji: string };

type RecurringRow = {
  id: number;
  title: string;
  amount_cents: number;
  category: string;
  frequency: string;
  day: number;
  next_due: number;
};

export async function migrate(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  if (version >= SCHEMA_VERSION) return;

  await db.withTransactionAsync(async () => {
    if (version < 1) {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL DEFAULT '',
          amount_cents INTEGER NOT NULL,
          category TEXT NOT NULL DEFAULT 'other',
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at);
      `);
    }

    if (version < 2) {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          label TEXT NOT NULL,
          emoji TEXT NOT NULL,
          sort INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS recurring (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL DEFAULT '',
          amount_cents INTEGER NOT NULL,
          category TEXT NOT NULL DEFAULT 'other',
          frequency TEXT NOT NULL,
          day INTEGER NOT NULL,
          next_due INTEGER NOT NULL
        );
      `);
      for (const [index, category] of DEFAULT_CATEGORIES.entries()) {
        await db.runAsync(
          'INSERT OR IGNORE INTO categories (id, label, emoji, sort) VALUES (?, ?, ?, ?)',
          category.id,
          category.label,
          category.emoji,
          index
        );
      }
    }

    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
  });
}

// ---------------------------------------------------------------- expenses

function expenseFromRow(row: ExpenseRow): Expense {
  return {
    id: row.id,
    title: row.title,
    amountCents: row.amount_cents,
    category: row.category,
    createdAt: row.created_at,
  };
}

export async function loadExpenses(db: SQLiteDatabase): Promise<Expense[]> {
  const rows = await db.getAllAsync<ExpenseRow>(
    'SELECT id, title, amount_cents, category, created_at FROM expenses ORDER BY created_at DESC, id DESC'
  );
  return rows.map(expenseFromRow);
}

export async function insertExpense(db: SQLiteDatabase, input: ExpenseInput): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO expenses (title, amount_cents, category, created_at) VALUES (?, ?, ?, ?)',
    input.title,
    input.amountCents,
    input.category,
    input.createdAt
  );
  return result.lastInsertRowId;
}

export async function updateExpenseRow(db: SQLiteDatabase, id: number, input: ExpenseInput) {
  await db.runAsync(
    'UPDATE expenses SET title = ?, amount_cents = ?, category = ?, created_at = ? WHERE id = ?',
    input.title,
    input.amountCents,
    input.category,
    input.createdAt,
    id
  );
}

export async function deleteExpenseRow(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM expenses WHERE id = ?', id);
}

export async function deleteAllExpenseRows(db: SQLiteDatabase) {
  await db.runAsync('DELETE FROM expenses');
}

// -------------------------------------------------------------- categories

export async function loadCategories(db: SQLiteDatabase): Promise<Category[]> {
  return db.getAllAsync<CategoryRow>('SELECT id, label, emoji FROM categories ORDER BY sort, id');
}

export async function insertCategory(db: SQLiteDatabase, category: Category) {
  // "Other" stays last so it reads as the catch-all.
  const row = await db.getFirstAsync<{ next: number }>(
    'SELECT COALESCE(MAX(sort), -1) + 1 AS next FROM categories WHERE id != ?',
    OTHER_CATEGORY_ID
  );
  const sort = row?.next ?? 0;
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE categories SET sort = sort + 1 WHERE id = ?',
      OTHER_CATEGORY_ID
    );
    await db.runAsync(
      'INSERT INTO categories (id, label, emoji, sort) VALUES (?, ?, ?, ?)',
      category.id,
      category.label,
      category.emoji,
      sort
    );
  });
}

/** Deleting a category moves its expenses and recurring items to "Other". */
export async function deleteCategoryRow(db: SQLiteDatabase, id: string) {
  if (id === OTHER_CATEGORY_ID) return;
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE expenses SET category = ? WHERE category = ?', OTHER_CATEGORY_ID, id);
    await db.runAsync('UPDATE recurring SET category = ? WHERE category = ?', OTHER_CATEGORY_ID, id);
    await db.runAsync('DELETE FROM categories WHERE id = ?', id);
  });
}

// --------------------------------------------------------------- recurring

function recurringFromRow(row: RecurringRow): Recurring {
  return {
    id: row.id,
    title: row.title,
    amountCents: row.amount_cents,
    category: row.category,
    frequency: row.frequency === 'weekly' ? 'weekly' : 'monthly',
    day: row.day,
    nextDue: row.next_due,
  };
}

export async function loadRecurring(db: SQLiteDatabase): Promise<Recurring[]> {
  const rows = await db.getAllAsync<RecurringRow>(
    'SELECT id, title, amount_cents, category, frequency, day, next_due FROM recurring ORDER BY next_due, id'
  );
  return rows.map(recurringFromRow);
}

export async function insertRecurring(
  db: SQLiteDatabase,
  input: RecurringInput,
  now: number
): Promise<void> {
  const nextDue = nextOccurrence(input.frequency as Frequency, input.day, now);
  await db.runAsync(
    'INSERT INTO recurring (title, amount_cents, category, frequency, day, next_due) VALUES (?, ?, ?, ?, ?, ?)',
    input.title,
    input.amountCents,
    input.category,
    input.frequency,
    input.day,
    nextDue
  );
}

export async function deleteRecurringRow(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM recurring WHERE id = ?', id);
}

/**
 * Log every recurring expense that has come due by `now` as a normal expense, and move each
 * item's next due date forward. Returns true if anything was added.
 */
export async function runDueRecurring(db: SQLiteDatabase, now: number): Promise<boolean> {
  const items = await loadRecurring(db);
  let added = false;

  for (const item of items) {
    const { dues, next } = dueOccurrences(item, now);
    if (dues.length === 0) continue;

    await db.withTransactionAsync(async () => {
      for (const createdAt of dues) {
        await insertExpense(db, {
          title: item.title,
          amountCents: item.amountCents,
          category: item.category,
          createdAt,
        });
      }
      await db.runAsync('UPDATE recurring SET next_due = ? WHERE id = ?', next, item.id);
    });
    added = true;
  }
  return added;
}
