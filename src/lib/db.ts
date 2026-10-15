import type { SQLiteDatabase } from 'expo-sqlite';

import { getCategory, type Expense, type ExpenseInput } from './expenses';

type Row = {
  id: number;
  title: string;
  amount_cents: number;
  category: string;
  created_at: number;
};

export async function migrate(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
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

function fromRow(row: Row): Expense {
  return {
    id: row.id,
    title: row.title,
    amountCents: row.amount_cents,
    category: getCategory(row.category).id,
    createdAt: row.created_at,
  };
}

export async function loadExpenses(db: SQLiteDatabase): Promise<Expense[]> {
  const rows = await db.getAllAsync<Row>(
    'SELECT id, title, amount_cents, category, created_at FROM expenses ORDER BY created_at DESC, id DESC'
  );
  return rows.map(fromRow);
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
