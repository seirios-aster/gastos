import { dayKey, dayLabel, daysInMonth, isSameMonth, startOfMonth, addMonths } from './dates';

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
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
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
