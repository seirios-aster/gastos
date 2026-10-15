import { dayKey, dayLabel, isSameMonth } from './dates';

export type CategoryId =
  | 'food'
  | 'groceries'
  | 'transport'
  | 'bills'
  | 'shopping'
  | 'health'
  | 'fun'
  | 'other';

export const CATEGORIES: { id: CategoryId; label: string; emoji: string }[] = [
  { id: 'food', label: 'Food', emoji: '🍔' },
  { id: 'groceries', label: 'Groceries', emoji: '🛒' },
  { id: 'transport', label: 'Transport', emoji: '🚌' },
  { id: 'bills', label: 'Bills', emoji: '🧾' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { id: 'health', label: 'Health', emoji: '💊' },
  { id: 'fun', label: 'Fun', emoji: '🎬' },
  { id: 'other', label: 'Other', emoji: '✨' },
];

export function getCategory(id: string) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

export type Expense = {
  id: number;
  title: string;
  amountCents: number;
  category: CategoryId;
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

export function categoryTotals(expenses: Expense[]) {
  const totals = new Map<CategoryId, number>();
  for (const e of expenses) {
    totals.set(e.category, (totals.get(e.category) ?? 0) + e.amountCents);
  }
  const grand = sumCents(expenses);
  return [...totals.entries()]
    .map(([id, totalCents]) => ({
      category: getCategory(id),
      totalCents,
      share: grand > 0 ? totalCents / grand : 0,
    }))
    .sort((a, b) => b.totalCents - a.totalCents);
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(expenses: Expense[]): string {
  const rows = expenses.map((e) => {
    const d = new Date(e.createdAt);
    const date = dayKey(e.createdAt);
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return [date, time, e.category, csvCell(e.title), (e.amountCents / 100).toFixed(2)].join(',');
  });
  return ['date,time,category,note,amount', ...rows].join('\n');
}
