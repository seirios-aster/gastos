import type { SQLiteDatabase } from 'expo-sqlite';

import {
  DEFAULT_CATEGORIES,
  OTHER_CATEGORY_ID,
  type Backup,
  type Category,
  type Expense,
  type ExpenseInput,
} from './expenses';
import { startOfDay } from './dates';
import { cleanPerson, type Direction, type Loan, type LoanInput, type Payment } from './loans';
import {
  advance,
  dueOccurrences,
  nextOccurrence,
  type Frequency,
  type Recurring,
  type RecurringInput,
} from './recurring';

/** Bump this and add a `version < N` block in `migrate` whenever the schema changes. */
const SCHEMA_VERSION = 5;

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
  paused: number;
  remind_days: number | null;
};

type LoanRow = {
  id: number;
  person: string;
  direction: string;
  amount_cents: number;
  note: string;
  created_at: number;
  due_at: number | null;
  remind: number;
};

type PaymentRow = { id: number; loan_id: number; amount_cents: number; paid_at: number };

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

    if (version < 3) {
      await db.execAsync('ALTER TABLE recurring ADD COLUMN paused INTEGER NOT NULL DEFAULT 0;');
    }

    if (version < 4) {
      // NULL means no reminder, so every existing item stays as it was.
      await db.execAsync('ALTER TABLE recurring ADD COLUMN remind_days INTEGER;');
    }

    if (version < 5) {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS loans (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          person TEXT NOT NULL,
          direction TEXT NOT NULL,
          amount_cents INTEGER NOT NULL,
          note TEXT NOT NULL DEFAULT '',
          created_at INTEGER NOT NULL,
          due_at INTEGER,
          remind INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS loan_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          loan_id INTEGER NOT NULL,
          amount_cents INTEGER NOT NULL,
          paid_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_loan_payments_loan ON loan_payments(loan_id);
      `);
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

/** SQLite allows only so many "?" in one statement, so long lists are deleted in chunks. */
const DELETE_CHUNK = 400;

async function deleteByIds(
  db: SQLiteDatabase,
  table: 'expenses' | 'recurring',
  ids: number[]
) {
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < ids.length; i += DELETE_CHUNK) {
      const chunk = ids.slice(i, i + DELETE_CHUNK);
      await db.runAsync(`DELETE FROM ${table} WHERE id IN (${chunk.map(() => '?').join(',')})`, chunk);
    }
  });
}

/** Delete several expenses in one go: all of them, or none if something fails. */
export async function deleteExpenseRows(db: SQLiteDatabase, ids: number[]) {
  await deleteByIds(db, 'expenses', ids);
}

/** Put deleted expenses back (with new ids) in one go. Returns the new ids, in the same order. */
export async function insertExpenses(db: SQLiteDatabase, inputs: ExpenseInput[]): Promise<number[]> {
  const ids: number[] = [];
  await db.withTransactionAsync(async () => {
    for (const input of inputs) ids.push(await insertExpense(db, input));
  });
  return ids;
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
    paused: row.paused === 1,
    remindDays: row.remind_days ?? null,
  };
}

export async function loadRecurring(db: SQLiteDatabase): Promise<Recurring[]> {
  const rows = await db.getAllAsync<RecurringRow>(
    'SELECT id, title, amount_cents, category, frequency, day, next_due, paused, remind_days FROM recurring ORDER BY next_due, id'
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
    'INSERT INTO recurring (title, amount_cents, category, frequency, day, next_due, remind_days) VALUES (?, ?, ?, ?, ?, ?, ?)',
    input.title,
    input.amountCents,
    input.category,
    input.frequency,
    input.day,
    nextDue,
    input.remindDays
  );
}

export async function updateRecurringRow(
  db: SQLiteDatabase,
  id: number,
  input: RecurringInput,
  now: number
): Promise<void> {
  const current = await db.getFirstAsync<{ frequency: string; day: number }>(
    'SELECT frequency, day FROM recurring WHERE id = ?',
    id
  );
  if (!current) return;
  // Only a new schedule moves the due date, so editing the amount never skips or repeats a charge.
  const scheduleChanged = current.frequency !== input.frequency || current.day !== input.day;
  const nextDue = scheduleChanged
    ? nextOccurrence(input.frequency as Frequency, input.day, now)
    : null;
  await db.runAsync(
    'UPDATE recurring SET title = ?, amount_cents = ?, category = ?, frequency = ?, day = ?, next_due = COALESCE(?, next_due), remind_days = ? WHERE id = ?',
    input.title,
    input.amountCents,
    input.category,
    input.frequency,
    input.day,
    nextDue,
    input.remindDays,
    id
  );
}

/**
 * Pause or resume a recurring item. Resuming restarts from the next due date on or after today,
 * so the paused stretch is never back-logged.
 */
export async function setRecurringPausedRow(
  db: SQLiteDatabase,
  id: number,
  paused: boolean,
  now: number
): Promise<void> {
  if (paused) {
    await db.runAsync('UPDATE recurring SET paused = 1 WHERE id = ?', id);
    return;
  }
  const current = await db.getFirstAsync<{ frequency: string; day: number }>(
    'SELECT frequency, day FROM recurring WHERE id = ?',
    id
  );
  if (!current) return;
  await db.runAsync(
    'UPDATE recurring SET paused = 0, next_due = ? WHERE id = ?',
    nextOccurrence(current.frequency as Frequency, current.day, now),
    id
  );
}

export async function deleteRecurringRow(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM recurring WHERE id = ?', id);
}

/** Stop several recurring items in one go: all of them, or none if something fails. */
export async function deleteRecurringRows(db: SQLiteDatabase, ids: number[]) {
  await deleteByIds(db, 'recurring', ids);
}

/**
 * Log every recurring expense that has come due by `now` as a normal expense, and move each
 * item's next due date forward. Returns true if anything was added.
 */
export async function runDueRecurring(db: SQLiteDatabase, now: number): Promise<boolean> {
  const items = (await loadRecurring(db)).filter((item) => !item.paused);
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

// ------------------------------------------------------------------- loans

export async function loadLoans(db: SQLiteDatabase): Promise<Loan[]> {
  const [rows, paymentRows] = await Promise.all([
    db.getAllAsync<LoanRow>(
      'SELECT id, person, direction, amount_cents, note, created_at, due_at, remind FROM loans ORDER BY created_at DESC, id DESC'
    ),
    db.getAllAsync<PaymentRow>(
      'SELECT id, loan_id, amount_cents, paid_at FROM loan_payments ORDER BY paid_at, id'
    ),
  ]);
  const byLoan = new Map<number, Payment[]>();
  for (const row of paymentRows) {
    const list = byLoan.get(row.loan_id) ?? [];
    list.push({ id: row.id, amountCents: row.amount_cents, paidAt: row.paid_at });
    byLoan.set(row.loan_id, list);
  }
  return rows.map((row) => ({
    id: row.id,
    person: row.person,
    direction: (row.direction === 'borrowed' ? 'borrowed' : 'lent') as Direction,
    amountCents: row.amount_cents,
    note: row.note,
    createdAt: row.created_at,
    dueAt: row.due_at,
    remind: row.remind === 1,
    payments: byLoan.get(row.id) ?? [],
  }));
}

export async function insertLoan(db: SQLiteDatabase, input: LoanInput): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO loans (person, direction, amount_cents, note, created_at, due_at, remind) VALUES (?, ?, ?, ?, ?, ?, ?)',
    cleanPerson(input.person),
    input.direction,
    input.amountCents,
    input.note,
    input.createdAt,
    input.dueAt,
    input.remind ? 1 : 0
  );
  return result.lastInsertRowId;
}

export async function updateLoanRow(db: SQLiteDatabase, id: number, input: LoanInput) {
  await db.runAsync(
    'UPDATE loans SET person = ?, direction = ?, amount_cents = ?, note = ?, created_at = ?, due_at = ?, remind = ? WHERE id = ?',
    cleanPerson(input.person),
    input.direction,
    input.amountCents,
    input.note,
    input.createdAt,
    input.dueAt,
    input.remind ? 1 : 0,
    id
  );
}

export async function insertPaymentRow(
  db: SQLiteDatabase,
  loanId: number,
  amountCents: number,
  paidAt: number
) {
  await db.runAsync(
    'INSERT INTO loan_payments (loan_id, amount_cents, paid_at) VALUES (?, ?, ?)',
    loanId,
    amountCents,
    paidAt
  );
}

export async function deletePaymentRow(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM loan_payments WHERE id = ?', id);
}

/** Delete loans together with their payments, all or nothing. */
export async function deleteLoanRows(db: SQLiteDatabase, ids: number[]) {
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < ids.length; i += DELETE_CHUNK) {
      const chunk = ids.slice(i, i + DELETE_CHUNK);
      const marks = chunk.map(() => '?').join(',');
      await db.runAsync(`DELETE FROM loan_payments WHERE loan_id IN (${marks})`, chunk);
      await db.runAsync(`DELETE FROM loans WHERE id IN (${marks})`, chunk);
    }
  });
}

// ------------------------------------------------------------------ backup

/**
 * Merge a backup into the database in one transaction, without touching existing rows. Anything
 * already present is skipped, so importing the same backup twice adds nothing. Expenses and
 * recurring items get new ids so they can never collide with local ones.
 */
export async function importBackupRows(
  db: SQLiteDatabase,
  backup: Backup,
  now = Date.now()
): Promise<{ expenses: number; categories: number; recurring: number; loans: number }> {
  const counts = { expenses: 0, categories: 0, recurring: 0, loans: 0 };

  await db.withTransactionAsync(async () => {
    for (const category of backup.categories) {
      const result = await db.runAsync(
        `INSERT OR IGNORE INTO categories (id, label, emoji, sort)
         VALUES (?, ?, ?, (SELECT COALESCE(MAX(sort), -1) + 1 FROM categories WHERE id != ?))`,
        category.id,
        category.label,
        category.emoji,
        OTHER_CATEGORY_ID
      );
      if (result.changes === 0) continue;
      // "Other" stays last, as in insertCategory.
      await db.runAsync(
        'UPDATE categories SET sort = sort + 1 WHERE id = ?',
        OTHER_CATEGORY_ID
      );
      counts.categories++;
    }

    // Rows inserted by this import must not count as "already there", or two identical rows inside
    // one backup (say, two identical subscriptions) would collapse into one.
    const maxId = async (table: 'expenses' | 'recurring') =>
      (await db.getFirstAsync<{ id: number }>(`SELECT COALESCE(MAX(id), 0) AS id FROM ${table}`))
        ?.id ?? 0;
    const maxExpenseId = await maxId('expenses');
    const maxRecurringId = await maxId('recurring');

    // A row pointing at a category this phone doesn't have would be orphaned, so it goes to "Other".
    const known = new Set((await loadCategories(db)).map((c) => c.id));
    const categoryOf = (id: string) => (known.has(id) ? id : OTHER_CATEGORY_ID);

    for (const expense of backup.expenses) {
      const row = [expense.title, expense.amountCents, categoryOf(expense.category), expense.createdAt];
      const result = await db.runAsync(
        `INSERT INTO expenses (title, amount_cents, category, created_at)
         SELECT ?, ?, ?, ?
         WHERE NOT EXISTS (
           SELECT 1 FROM expenses
           WHERE id <= ? AND title = ? AND amount_cents = ? AND category = ? AND created_at = ?
         )`,
        [...row, maxExpenseId, ...row]
      );
      counts.expenses += result.changes;
    }

    for (const item of backup.recurring) {
      // If the item is due today but the backup says it already moved past today's date, the old
      // phone logged today's expense; the backup carries that expense, so don't log it again.
      let nextDue = nextOccurrence(item.frequency, item.day, now);
      if (startOfDay(nextDue) <= startOfDay(now) && item.nextDue > nextDue) {
        nextDue = advance(item.frequency, item.day, nextDue);
      }
      const result = await db.runAsync(
        `INSERT INTO recurring (title, amount_cents, category, frequency, day, next_due, paused, remind_days)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?
         WHERE NOT EXISTS (
           SELECT 1 FROM recurring
           WHERE id <= ? AND title = ? AND amount_cents = ? AND frequency = ? AND day = ?
         )`,
        [
          item.title,
          item.amountCents,
          categoryOf(item.category),
          item.frequency,
          item.day,
          nextDue,
          item.paused ? 1 : 0,
          item.remindDays,
          maxRecurringId,
          item.title,
          item.amountCents,
          item.frequency,
          item.day,
        ]
      );
      counts.recurring += result.changes;
    }

    // A loan already on this phone (same person, direction, amount and day) is skipped, payments and
    // all, so importing the same backup twice adds nothing.
    const maxLoanId =
      (await db.getFirstAsync<{ id: number }>('SELECT COALESCE(MAX(id), 0) AS id FROM loans'))?.id ?? 0;
    for (const item of backup.loans) {
      const person = cleanPerson(item.person);
      const result = await db.runAsync(
        `INSERT INTO loans (person, direction, amount_cents, note, created_at, due_at, remind)
         SELECT ?, ?, ?, ?, ?, ?, ?
         WHERE NOT EXISTS (
           SELECT 1 FROM loans
           WHERE id <= ? AND LOWER(person) = LOWER(?) AND direction = ? AND amount_cents = ? AND created_at = ?
         )`,
        [
          person,
          item.direction,
          item.amountCents,
          item.note,
          item.createdAt,
          item.dueAt,
          item.remind ? 1 : 0,
          maxLoanId,
          person,
          item.direction,
          item.amountCents,
          item.createdAt,
        ]
      );
      if (result.changes === 0) continue;
      counts.loans++;
      for (const payment of item.payments) {
        await insertPaymentRow(db, result.lastInsertRowId, payment.amountCents, payment.paidAt);
      }
    }
  });

  return counts;
}
