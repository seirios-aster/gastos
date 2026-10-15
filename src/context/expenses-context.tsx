import Storage from 'expo-sqlite/kv-store';
import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  deleteAllExpenseRows,
  deleteExpenseRow,
  insertExpense,
  loadExpenses,
  updateExpenseRow,
} from '@/lib/db';
import { sortExpenses, type Expense, type ExpenseInput } from '@/lib/expenses';

const CURRENCY_KEY = 'currency';

type ExpensesContextValue = {
  expenses: Expense[];
  ready: boolean;
  /** Currency symbol shown before amounts. Empty string means no currency. */
  currency: string;
  setCurrency: (symbol: string) => void;
  addExpense: (input: ExpenseInput) => Promise<void>;
  updateExpense: (id: number, input: ExpenseInput) => Promise<void>;
  deleteExpense: (id: number) => Promise<void>;
  clearAll: () => Promise<void>;
};

const ExpensesContext = createContext<ExpensesContextValue | null>(null);

export function ExpensesProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [ready, setReady] = useState(false);
  const [currency, setCurrencyState] = useState(() => Storage.getItemSync(CURRENCY_KEY) ?? '');

  useEffect(() => {
    let cancelled = false;
    loadExpenses(db).then((rows) => {
      if (cancelled) return;
      setExpenses(rows);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  const setCurrency = useCallback((symbol: string) => {
    setCurrencyState(symbol);
    Storage.setItemSync(CURRENCY_KEY, symbol);
  }, []);

  const addExpense = useCallback(
    async (input: ExpenseInput) => {
      const id = await insertExpense(db, input);
      setExpenses((prev) => sortExpenses([...prev, { id, ...input }]));
    },
    [db]
  );

  const updateExpense = useCallback(
    async (id: number, input: ExpenseInput) => {
      await updateExpenseRow(db, id, input);
      setExpenses((prev) => sortExpenses(prev.map((e) => (e.id === id ? { id, ...input } : e))));
    },
    [db]
  );

  const deleteExpense = useCallback(
    async (id: number) => {
      await deleteExpenseRow(db, id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    },
    [db]
  );

  const clearAll = useCallback(async () => {
    await deleteAllExpenseRows(db);
    setExpenses([]);
  }, [db]);

  const value = useMemo(
    () => ({
      expenses,
      ready,
      currency,
      setCurrency,
      addExpense,
      updateExpense,
      deleteExpense,
      clearAll,
    }),
    [expenses, ready, currency, setCurrency, addExpense, updateExpense, deleteExpense, clearAll]
  );

  return <ExpensesContext.Provider value={value}>{children}</ExpensesContext.Provider>;
}

export function useExpenses() {
  const ctx = useContext(ExpensesContext);
  if (!ctx) throw new Error('useExpenses must be used inside <ExpensesProvider>');
  return ctx;
}
