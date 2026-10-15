import { useSQLiteContext } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';

import {
  deleteAllExpenseRows,
  deleteCategoryRow,
  deleteExpenseRow,
  deleteRecurringRow,
  insertCategory,
  insertExpense,
  insertRecurring,
  loadCategories,
  loadExpenses,
  loadRecurring,
  runDueRecurring,
  updateExpenseRow,
} from '@/lib/db';
import {
  DEFAULT_CATEGORIES,
  sortExpenses,
  type Category,
  type Expense,
  type ExpenseInput,
} from '@/lib/expenses';
import type { Recurring, RecurringInput } from '@/lib/recurring';

const CURRENCY_KEY = 'currency';
const BUDGET_KEY = 'budget_cents';

type ExpensesContextValue = {
  expenses: Expense[];
  categories: Category[];
  recurring: Recurring[];
  ready: boolean;
  /** Currency symbol shown before amounts. Empty string means no currency. */
  currency: string;
  setCurrency: (symbol: string) => void;
  /** Monthly budget in cents; 0 means no budget. */
  budgetCents: number;
  setBudgetCents: (cents: number) => void;
  addExpense: (input: ExpenseInput) => Promise<void>;
  updateExpense: (id: number, input: ExpenseInput) => Promise<void>;
  deleteExpense: (id: number) => Promise<void>;
  clearAll: () => Promise<void>;
  addCategory: (label: string, emoji: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addRecurring: (input: RecurringInput) => Promise<void>;
  deleteRecurring: (id: number) => Promise<void>;
};

const ExpensesContext = createContext<ExpensesContextValue | null>(null);

function readBudget(): number {
  const value = Number(Storage.getItemSync(BUDGET_KEY));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function ExpensesProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [ready, setReady] = useState(false);
  const [currency, setCurrencyState] = useState(() => Storage.getItemSync(CURRENCY_KEY) ?? '');
  const [budgetCents, setBudgetState] = useState(readBudget);
  const syncing = useRef(false);

  /** Log any recurring expenses that have come due, then refresh what's on screen. */
  const syncRecurring = useCallback(async () => {
    if (syncing.current) return;
    syncing.current = true;
    try {
      const added = await runDueRecurring(db, Date.now());
      if (added) {
        const [nextExpenses, nextRecurring] = await Promise.all([
          loadExpenses(db),
          loadRecurring(db),
        ]);
        setExpenses(nextExpenses);
        setRecurring(nextRecurring);
      }
    } finally {
      syncing.current = false;
    }
  }, [db]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [nextExpenses, nextCategories, nextRecurring] = await Promise.all([
        loadExpenses(db),
        loadCategories(db),
        loadRecurring(db),
      ]);
      if (cancelled) return;
      setExpenses(nextExpenses);
      setCategories(nextCategories);
      setRecurring(nextRecurring);
      setReady(true);
      await syncRecurring();
    })();
    return () => {
      cancelled = true;
    };
  }, [db, syncRecurring]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncRecurring();
    });
    return () => subscription.remove();
  }, [syncRecurring]);

  const setCurrency = useCallback((symbol: string) => {
    setCurrencyState(symbol);
    Storage.setItemSync(CURRENCY_KEY, symbol);
  }, []);

  const setBudgetCents = useCallback((cents: number) => {
    const value = cents > 0 ? Math.round(cents) : 0;
    setBudgetState(value);
    Storage.setItemSync(BUDGET_KEY, String(value));
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

  const addCategory = useCallback(
    async (label: string, emoji: string) => {
      const id = `c_${Date.now().toString(36)}`;
      await insertCategory(db, { id, label, emoji });
      setCategories(await loadCategories(db));
    },
    [db]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      await deleteCategoryRow(db, id);
      const [nextCategories, nextExpenses, nextRecurring] = await Promise.all([
        loadCategories(db),
        loadExpenses(db),
        loadRecurring(db),
      ]);
      setCategories(nextCategories);
      setExpenses(nextExpenses);
      setRecurring(nextRecurring);
    },
    [db]
  );

  const addRecurring = useCallback(
    async (input: RecurringInput) => {
      await insertRecurring(db, input, Date.now());
      setRecurring(await loadRecurring(db));
      // If it's due today it is logged right away.
      await syncRecurring();
    },
    [db, syncRecurring]
  );

  const deleteRecurring = useCallback(
    async (id: number) => {
      await deleteRecurringRow(db, id);
      setRecurring((prev) => prev.filter((r) => r.id !== id));
    },
    [db]
  );

  const value = useMemo(
    () => ({
      expenses,
      categories,
      recurring,
      ready,
      currency,
      setCurrency,
      budgetCents,
      setBudgetCents,
      addExpense,
      updateExpense,
      deleteExpense,
      clearAll,
      addCategory,
      deleteCategory,
      addRecurring,
      deleteRecurring,
    }),
    [
      expenses,
      categories,
      recurring,
      ready,
      currency,
      setCurrency,
      budgetCents,
      setBudgetCents,
      addExpense,
      updateExpense,
      deleteExpense,
      clearAll,
      addCategory,
      deleteCategory,
      addRecurring,
      deleteRecurring,
    ]
  );

  return <ExpensesContext.Provider value={value}>{children}</ExpensesContext.Provider>;
}

export function useExpenses() {
  const ctx = useContext(ExpensesContext);
  if (!ctx) throw new Error('useExpenses must be used inside <ExpensesProvider>');
  return ctx;
}
