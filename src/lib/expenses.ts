import { dayKey, dayLabel, daysInMonth, isSameMonth, startOfMonth, addMonths } from './dates';
import { MAX_CENTS } from './money';
import type { Recurring } from './recurring';

export type Category = { id: string; label: string; emoji: string };

/** Seeded into the database the first time the app runs; users can add and remove their own. */
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', label: 'Food', emoji: '🍔' },
  { id: 'groceries', label: 'Groceries', emoji: '🛒' },
  { id: 'transport', label: 'Transport', emoji: '🚌' },
  { id: 'bills', label: 'Bills', emoji: '🧾' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { id: 'health', label: 'Health', emoji: '💊' },
  { id: 'fun', label: 'Fun', emoji: '🎬' },
  { id: 'other', label: 'Other', emoji: '✨' },
];

/** The fallback category. It always exists and cannot be deleted. */
export const OTHER_CATEGORY_ID = 'other';

/** Look a category up by id, falling back to "Other" if it was deleted. */
export function getCategory(categories: Category[], id: string): Category {
  return (
    categories.find((c) => c.id === id) ??
    categories.find((c) => c.id === OTHER_CATEGORY_ID) ??
    DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1]
  );
}

export type Expense = {
  id: number;
  title: string;
  amountCents: number;
  category: string;
  /** Unix time in ms when the expense happened. */
  createdAt: number;
};

export type ExpenseInput = Omit<Expense, 'id'>;

export type DayGroup = {
  key: string;
  label: string;
  totalCents: number;
  data: Expense[];
};

/** Newest first; ties broken by id so the order is stable. */
export function sortExpenses(expenses: Expense[]): Expense[] {
  return [...expenses].sort((a, b) => b.createdAt - a.createdAt || b.id - a.id);
}

export function sumCents(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amountCents, 0);
}

export function expensesInMonth(expenses: Expense[], monthTs: number): Expense[] {
  return expenses.filter((e) => isSameMonth(e.createdAt, monthTs));
}

export function expensesOnDay(expenses: Expense[], dayTs: number): Expense[] {
  const key = dayKey(dayTs);
  return expenses.filter((e) => dayKey(e.createdAt) === key);
}

/** Match the query against the note, the category name and the amount. */
export function searchExpenses(
  expenses: Expense[],
  categories: Category[],
  query: string
): Expense[] {
  const q = query.trim().toLowerCase();
  if (!q) return expenses;
  return expenses.filter(
    (e) =>
      e.title.toLowerCase().includes(q) ||
      getCategory(categories, e.category).label.toLowerCase().includes(q) ||
      (e.amountCents / 100).toFixed(2).includes(q)
  );
}

/** Group a newest-first list into per-day sections with totals. */
export function groupByDay(expenses: Expense[], now: number): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const expense of expenses) {
    const key = dayKey(expense.createdAt);
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      group = { key, label: dayLabel(expense.createdAt, now), totalCents: 0, data: [] };
      groups.push(group);
    }
    group.data.push(expense);
    group.totalCents += expense.amountCents;
  }
  return groups;
}

export function categoryTotals(expenses: Expense[], categories: Category[]) {
  const totals = new Map<string, number>();
  for (const e of expenses) {
    const id = getCategory(categories, e.category).id;
    totals.set(id, (totals.get(id) ?? 0) + e.amountCents);
  }
  const grand = sumCents(expenses);
  return [...totals.entries()]
    .map(([id, totalCents]) => ({
      category: getCategory(categories, id),
      totalCents,
      share: grand > 0 ? totalCents / grand : 0,
    }))
    .sort((a, b) => b.totalCents - a.totalCents);
}

/** Total spent on each day of the month containing `monthTs` (index 0 = the 1st). */
export function dailyTotals(expenses: Expense[], monthTs: number): number[] {
  const totals = new Array<number>(daysInMonth(monthTs)).fill(0);
  for (const e of expensesInMonth(expenses, monthTs)) {
    totals[new Date(e.createdAt).getDate() - 1] += e.amountCents;
  }
  return totals;
}

/** Totals for `count` months ending at (and including) the month of `endMonthTs`, oldest first. */
export function monthlyTotals(expenses: Expense[], endMonthTs: number, count: number) {
  const end = startOfMonth(endMonthTs);
  const result: { monthTs: number; totalCents: number }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const monthTs = addMonths(end, -i);
    result.push({ monthTs, totalCents: sumCents(expensesInMonth(expenses, monthTs)) });
  }
  return result;
}

function csvCell(value: string): string {
  // Spreadsheets run cells starting with these as formulas; a leading quote keeps them text.
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(expenses: Expense[], categories: Category[]): string {
  const rows = expenses.map((e) => {
    const d = new Date(e.createdAt);
    const date = dayKey(e.createdAt);
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const category = getCategory(categories, e.category).label;
    return [date, time, csvCell(category), csvCell(e.title), (e.amountCents / 100).toFixed(2)].join(
      ','
    );
  });
  return ['date,time,category,note,amount', ...rows].join('\n');
}

export type Backup = {
  version: 1;
  exportedAt: number;
  categories: Category[];
  expenses: Expense[];
  recurring: Recurring[];
};

export function toBackupJson(
  data: { expenses: Expense[]; categories: Category[]; recurring: Recurring[] },
  exportedAt: number
): string {
  const backup: Backup = {
    version: 1,
    exportedAt,
    categories: data.categories,
    expenses: data.expenses,
    recurring: data.recurring,
  };
  return JSON.stringify(backup);
}

const MAX_EXPENSES = 200_000;
const MAX_CATEGORIES = 500;
const MAX_RECURRING = 1_000;
/** Longest note the app lets you type. */
export const MAX_NOTE_LENGTH = 200;
/** Backups accept longer notes than the app allows (older data), and trim rather than refuse them. */
const MAX_TITLE_LENGTH = 2_000;
const MAX_SHORT_LENGTH = 100;
/** The latest moment a Date can represent. */
const MAX_TIMESTAMP = 8.64e15;

class InvalidBackup extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown, maxLength: number, minLength = 1): value is string {
  return typeof value === 'string' && value.length >= minLength && value.length <= maxLength;
}

function isInt(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
}

function isTimestamp(value: unknown): value is number {
  return isInt(value, -MAX_TIMESTAMP, MAX_TIMESTAMP);
}

function readCategory(value: unknown): Category | null {
  if (!isRecord(value)) return null;
  const { id, label, emoji } = value;
  if (!isText(id, MAX_SHORT_LENGTH) || !isText(label, MAX_SHORT_LENGTH)) return null;
  if (!isText(emoji, MAX_SHORT_LENGTH)) return null;
  return { id, label, emoji };
}

function readExpense(value: unknown): Expense | null {
  if (!isRecord(value)) return null;
  const { id, title, amountCents, category, createdAt } = value;
  if (!isInt(id, 1, Number.MAX_SAFE_INTEGER) || typeof title !== 'string') return null;
  if (!isInt(amountCents, 1, MAX_CENTS) || !isText(category, MAX_SHORT_LENGTH)) return null;
  if (!isTimestamp(createdAt)) return null;
  return { id, title: title.slice(0, MAX_TITLE_LENGTH), amountCents, category, createdAt };
}

function readRecurring(value: unknown): Recurring | null {
  if (!isRecord(value)) return null;
  const { id, title, amountCents, category, frequency, day, nextDue } = value;
  if (!isInt(id, 1, Number.MAX_SAFE_INTEGER) || typeof title !== 'string') return null;
  if (!isInt(amountCents, 1, MAX_CENTS) || !isText(category, MAX_SHORT_LENGTH)) return null;
  if (frequency !== 'weekly' && frequency !== 'monthly') return null;
  const [firstDay, lastDay] = frequency === 'weekly' ? [0, 6] : [1, 31];
  if (!isInt(day, firstDay, lastDay) || !isTimestamp(nextDue)) return null;
  return { id, title: title.slice(0, MAX_TITLE_LENGTH), amountCents, category, frequency, day, nextDue };
}

function readList<T>(
  value: unknown,
  name: string,
  max: number,
  read: (item: unknown) => T | null
): T[] {
  if (!Array.isArray(value)) throw new InvalidBackup(`The backup has no list of ${name}.`);
  if (value.length > max) throw new InvalidBackup(`The backup has too many ${name}.`);
  return value.map((item, index) => {
    const row = read(item);
    if (!row) throw new InvalidBackup(`Entry ${index + 1} of ${name} is not valid.`);
    return row;
  });
}

/** Strictly validate backup text; nothing is trusted, and only known fields are kept. */
export function parseBackup(
  text: string
): { ok: true; backup: Backup } | { ok: false; error: string } {
  let data: unknown;
  try {
    data = JSON.parse(text.trim()); // trim also drops a leading byte-order mark
  } catch {
    return { ok: false, error: 'This is not a Gastos backup.' };
  }

  try {
    if (!isRecord(data)) throw new InvalidBackup('This is not a Gastos backup.');
    const { version, exportedAt, categories, expenses, recurring } = data;
    if (version !== 1) throw new InvalidBackup('This backup version is not supported.');
    if (!isTimestamp(exportedAt)) throw new InvalidBackup('The backup date is not valid.');
    return {
      ok: true,
      backup: {
        version,
        exportedAt,
        categories: readList(categories, 'categories', MAX_CATEGORIES, readCategory),
        expenses: readList(expenses, 'expenses', MAX_EXPENSES, readExpense),
        recurring: readList(recurring, 'recurring items', MAX_RECURRING, readRecurring),
      },
    };
  } catch (error) {
    if (error instanceof InvalidBackup) return { ok: false, error: error.message };
    throw error;
  }
}
