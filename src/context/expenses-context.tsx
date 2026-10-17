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
  deleteExpenseRows,
  deleteRecurringRows,
  importBackupRows,
  insertCategory,
  insertExpense,
  insertExpenses,
  insertRecurring,
  loadCategories,
  loadExpenses,
  loadRecurring,
  runDueRecurring,
  setRecurringPausedRow,
  updateExpenseRow,
  updateRecurringRow,
} from '@/lib/db';
import {
  DEFAULT_CATEGORIES,
  parseBackup,
  sortExpenses,
  toBackupJson,
  type Category,
  type Expense,
  type ExpenseInput,
} from '@/lib/expenses';
import type { Recurring, RecurringInput } from '@/lib/recurring';
import { syncReminders } from '@/lib/reminders';

const CURRENCY_KEY = 'currency';
const BUDGET_KEY = 'budget_cents';
const LAST_CATEGORY_KEY = 'last_category';

/** How long the "Undo" offer for a deleted expense stays up. */
const UNDO_MS = 6000;

type ImportResult =
  | { ok: true; expenses: number; categories: number; recurring: number }
  | { ok: false; error: string };

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
  /** Category last used to log an expense; empty string if none yet. */
  lastCategory: string;
  setLastCategory: (id: string) => void;
  addExpense: (input: ExpenseInput) => Promise<void>;
  updateExpense: (id: number, input: ExpenseInput) => Promise<void>;
  deleteExpense: (id: number) => Promise<void>;
  /** Delete several at once. One undo brings all of them back. */
  deleteExpenses: (ids: number[]) => Promise<void>;
  /** The expense(s) deleted most recently, kept for a few seconds so they can be undone. */
  lastDeleted: Expense[] | null;
  undoDelete: () => Promise<void>;
  dismissUndo: () => void;
  clearAll: () => Promise<void>;
  addCategory: (label: string, emoji: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addRecurring: (input: RecurringInput) => Promise<void>;
  updateRecurring: (id: number, input: RecurringInput) => Promise<void>;
  /** Pause or resume a recurring item. Resuming never back-logs the paused days. */
  setRecurringPaused: (id: number, paused: boolean) => Promise<void>;
  deleteRecurring: (id: number) => Promise<void>;
  /** Stop several recurring items at once. */
  deleteRecurrings: (ids: number[]) => Promise<void>;
  /** All data as a JSON backup that `importBackup` accepts. */
  exportBackup: () => string;
  importBackup: (text: string) => Promise<ImportResult>;
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
  const [lastCategory, setLastCategoryState] = useState(
    () => Storage.getItemSync(LAST_CATEGORY_KEY) ?? ''
  );
  const [lastDeleted, setLastDeleted] = useState<Expense[] | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const syncing = useRef(false);
  const syncAgain = useRef(false);
  const undoing = useRef(false);

  /** Log any recurring expenses that have come due, then refresh what's on screen. */
  const syncRecurring = useCallback(async () => {
    // A request that arrives mid-sync (e.g. a new item due today) may have missed the sync's
    // snapshot of the items, so it runs once more instead of being dropped.
    if (syncing.current) {
      syncAgain.current = true;
      return;
    }
    syncing.current = true;
    try {
      do {
        syncAgain.current = false;
        const added = await runDueRecurring(db, Date.now());
        if (added) {
          const [nextExpenses, nextRecurring] = await Promise.all([
            loadExpenses(db),
            loadRecurring(db),
          ]);
          setExpenses(nextExpenses);
          setRecurring(nextRecurring);
        }
      } while (syncAgain.current);
    } catch (error) {
      console.warn('Could not log recurring expenses', error);
    } finally {
      syncing.current = false;
    }
  }, [db]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [nextExpenses, nextCategories, nextRecurring] = await Promise.all([
          loadExpenses(db),
          loadCategories(db),
          loadRecurring(db),
        ]);
        if (cancelled) return;
        setExpenses(nextExpenses);
        setCategories(nextCategories);
        setRecurring(nextRecurring);
      } catch (error) {
        console.warn('Could not load data', error);
      } finally {
        // Never leave the app waiting on a load that failed.
        if (!cancelled) setReady(true);
      }
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

  // Keep the phone's pending reminders in step with the recurring items, and top them up whenever
  // the app comes back to the front so they never run out.
  const reminderInputs = useRef({ recurring, categories, currency });
  useEffect(() => {
    reminderInputs.current = { recurring, categories, currency };
    if (ready) void syncReminders(recurring, categories, currency);
  }, [ready, recurring, categories, currency]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const latest = reminderInputs.current;
      void syncReminders(latest.recurring, latest.categories, latest.currency);
    });
    return () => subscription.remove();
  }, []);

  const setCurrency = useCallback((symbol: string) => {
    setCurrencyState(symbol);
    Storage.setItemSync(CURRENCY_KEY, symbol);
  }, []);

  const setBudgetCents = useCallback((cents: number) => {
    const value = cents > 0 ? Math.round(cents) : 0;
    setBudgetState(value);
    Storage.setItemSync(BUDGET_KEY, String(value));
  }, []);

  const setLastCategory = useCallback((id: string) => {
    setLastCategoryState(id);
    Storage.setItemSync(LAST_CATEGORY_KEY, id);
  }, []);

  useEffect(() => () => clearTimeout(undoTimer.current), []);

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

  const dismissUndo = useCallback(() => {
    clearTimeout(undoTimer.current);
    setLastDeleted(null);
  }, []);

  const deleteExpenses = useCallback(
    async (ids: number[]) => {
      const wanted = new Set(ids);
      const deleted = expenses.filter((e) => wanted.has(e.id));
      if (deleted.length === 0) return;
      await deleteExpenseRows(db, deleted.map((e) => e.id));
      setExpenses((prev) => prev.filter((e) => !wanted.has(e.id)));
      clearTimeout(undoTimer.current);
      setLastDeleted(deleted);
      undoTimer.current = setTimeout(() => setLastDeleted(null), UNDO_MS);
    },
    [db, expenses]
  );

  const deleteExpense = useCallback((id: number) => deleteExpenses([id]), [deleteExpenses]);

  const undoDelete = useCallback(async () => {
    if (!lastDeleted || undoing.current) return;
    undoing.current = true;
    try {
      // Same title, amount, category and date; only the ids are new. Hide the toast only after the
      // re-insert worked, so a failure leaves the offer (and the error) visible.
      const ids = await insertExpenses(db, lastDeleted);
      dismissUndo();
      setExpenses((prev) =>
        sortExpenses([...prev, ...lastDeleted.map((e, i) => ({ ...e, id: ids[i] }))])
      );
    } finally {
      undoing.current = false;
    }
  }, [db, lastDeleted, dismissUndo]);

  const clearAll = useCallback(async () => {
    await deleteAllExpenseRows(db);
    setExpenses([]);
    dismissUndo();
  }, [db, dismissUndo]);

  const addCategory = useCallback(
    async (label: string, emoji: string) => {
      // The random suffix keeps two categories added in the same millisecond from colliding.
      const id = `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
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

  const updateRecurring = useCallback(
    async (id: number, input: RecurringInput) => {
      await updateRecurringRow(db, id, input, Date.now());
      setRecurring(await loadRecurring(db));
      await syncRecurring();
    },
    [db, syncRecurring]
  );

  const setRecurringPaused = useCallback(
    async (id: number, paused: boolean) => {
      await setRecurringPausedRow(db, id, paused, Date.now());
      setRecurring(await loadRecurring(db));
      // Resuming on the due day logs that day's expense right away.
      if (!paused) await syncRecurring();
    },
    [db, syncRecurring]
  );

  const deleteRecurrings = useCallback(
    async (ids: number[]) => {
      if (ids.length === 0) return;
      await deleteRecurringRows(db, ids);
      const gone = new Set(ids);
      setRecurring((prev) => prev.filter((r) => !gone.has(r.id)));
    },
    [db]
  );

  const deleteRecurring = useCallback((id: number) => deleteRecurrings([id]), [deleteRecurrings]);

  const exportBackup = useCallback(
    () => toBackupJson({ expenses, categories, recurring }, Date.now()),
    [expenses, categories, recurring]
  );

  const importBackup = useCallback(
    async (text: string): Promise<ImportResult> => {
      const parsed = parseBackup(text);
      if (!parsed.ok) return parsed;

      // The import is one big transaction; keep the recurring sync from writing in the middle of it.
      while (syncing.current) await new Promise((resolve) => setTimeout(resolve, 50));
      syncing.current = true;
      let counts;
      try {
        counts = await importBackupRows(db, parsed.backup);
      } catch (error) {
        console.warn('Could not import backup', error);
        return { ok: false, error: 'Could not save the backup. Nothing was imported.' };
      } finally {
        syncing.current = false;
      }
      const [nextExpenses, nextCategories, nextRecurring] = await Promise.all([
        loadExpenses(db),
        loadCategories(db),
        loadRecurring(db),
      ]);
      setExpenses(nextExpenses);
      setCategories(nextCategories);
      setRecurring(nextRecurring);
      await syncRecurring();
      return { ok: true, ...counts };
    },
    [db, syncRecurring]
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
      lastCategory,
      setLastCategory,
      addExpense,
      updateExpense,
      deleteExpense,
      deleteExpenses,
      lastDeleted,
      undoDelete,
      dismissUndo,
      clearAll,
      addCategory,
      deleteCategory,
      addRecurring,
      updateRecurring,
      setRecurringPaused,
      deleteRecurring,
      deleteRecurrings,
      exportBackup,
      importBackup,
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
      lastCategory,
      setLastCategory,
      addExpense,
      updateExpense,
      deleteExpense,
      deleteExpenses,
      lastDeleted,
      undoDelete,
      dismissUndo,
      clearAll,
      addCategory,
      deleteCategory,
      addRecurring,
      updateRecurring,
      setRecurringPaused,
      deleteRecurring,
      deleteRecurrings,
      exportBackup,
      importBackup,
    ]
  );

  return <ExpensesContext.Provider value={value}>{children}</ExpensesContext.Provider>;
}

export function useExpenses() {
  const ctx = useContext(ExpensesContext);
  if (!ctx) throw new Error('useExpenses must be used inside <ExpensesProvider>');
  return ctx;
}
