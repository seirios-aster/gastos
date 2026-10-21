import { useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FocusInput, useFocusStyle } from '@/components/focus-input';
import { BudgetProgress } from '@/components/budget-progress';
import { Button } from '@/components/button';
import { ActionSheet } from '@/components/action-sheet';
import { CategoryChips } from '@/components/category-chips';
import { ExpenseRow } from '@/components/expense-row';
import { ExpenseSheet } from '@/components/expense-sheet';
import { FieldError } from '@/components/field-error';
import { confirmDeleteExpenses, info } from '@/components/notices';
import { GlassScreen } from '@/components/glass-screen';
import { HeaderActions } from '@/components/header-actions';
import { SelectionBar } from '@/components/selection-bar';
import { SummaryCard } from '@/components/summary-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { useInputStyle } from '@/hooks/use-input-style';
import { useNow } from '@/hooks/use-now';
import { useSelection } from '@/hooks/use-selection';
import { useSheetNotice } from '@/hooks/use-sheet-notice';
import { useTheme } from '@/hooks/use-theme';
import { addDays, longDateLabel } from '@/lib/dates';
import {
  MAX_NOTE_LENGTH,
  expensesInMonth,
  expensesOnDay,
  sumCents,
  type Expense,
} from '@/lib/expenses';
import { tap } from '@/lib/haptics';
import { formatMoney, parseAmountToCents } from '@/lib/money';

export default function TodayScreen() {
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const [amountFocused, setAmountFocused] = useState(false);
  const amountFocus = useFocusStyle(amountFocused);
  const now = useNow();
  const {
    expenses,
    categories,
    currency,
    budgetCents,
    lastCategory,
    addExpense,
    setLastCategory,
    deleteExpenses,
  } = useExpenses();

  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [chosenCategory, setCategory] = useState(lastCategory || 'food');
  const [invalid, setInvalid] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const submitting = useRef(false);
  const { notify, sheetProps } = useSheetNotice();

  // The chosen category may have been deleted in Settings; fall back to the first one.
  const category = categories.some((c) => c.id === chosenCategory)
    ? chosenCategory
    : (categories[0]?.id ?? 'other');

  const today = expensesOnDay(expenses, now);
  const selection = useSelection(today.map((e) => e.id));
  const monthSpent = sumCents(expensesInMonth(expenses, now));
  const todayTotal = sumCents(today);
  const yesterdayTotal = sumCents(expensesOnDay(expenses, addDays(now, -1)));

  /** Ask, then delete everything picked; the Undo toast can bring it all back. */
  function deleteSelected() {
    const ids = selection.ids;
    notify(
      confirmDeleteExpenses(ids.length, async () => {
        try {
          await deleteExpenses(ids);
          selection.clear();
        } catch (error) {
          console.warn('Could not delete the expenses', error);
          notify(info('Could not delete', 'Please try again.'));
        }
      })
    );
  }

  async function submit() {
    // Return on the keyboard and the button can both fire while the first save is still running.
    if (submitting.current) return;
    const amountCents = parseAmountToCents(amount);
    if (amountCents === null) {
      setInvalid(true);
      return;
    }
    submitting.current = true;
    try {
      await addExpense({ title: title.trim(), amountCents, category, createdAt: Date.now() });
      if (category !== lastCategory) setLastCategory(category);
      setAmount('');
      setTitle('');
      setInvalid(false);
      Keyboard.dismiss();
      tap();
    } catch (error) {
      console.warn('Could not save the expense', error);
      notify(info('Could not save', 'The expense was not saved. Please try again.'));
    } finally {
      submitting.current = false;
    }
  }

  return (
    <GlassScreen style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag">
            <View style={styles.header}>
              <View style={styles.titles}>
                <ThemedText type="small" themeColor="textSecondary">
                  {longDateLabel(now)}
                </ThemedText>
                <ThemedText type="subtitle" accessibilityRole="header">
                  Today
                </ThemedText>
              </View>
              <HeaderActions />
            </View>

            <SummaryCard
              label="Spent today"
              amount={formatMoney(todayTotal, currency)}
              footer={`${today.length} ${today.length === 1 ? 'expense' : 'expenses'} · Yesterday ${formatMoney(yesterdayTotal, currency)}`}>
              <BudgetProgress
                spentCents={monthSpent}
                budgetCents={budgetCents}
                currency={currency}
                allowanceNow={now}
              />
            </SummaryCard>

            <ThemedView type="backgroundElement" blur style={styles.addCard}>
              {/* The whole amount row is a field (a recessed well), so it reads as somewhere to type. */}
              <View style={[styles.amountRow, inputStyle, styles.amountField, amountFocus]}>
                {currency ? <ThemedText style={styles.amountSymbol}>{currency}</ThemedText> : null}
                <TextInput
                  style={[
                    styles.amountInput,
                    // A bold "0.00" hint looks like a value someone typed.
                    { color: theme.text, fontWeight: amount ? '600' : '400' },
                  ]}
                  value={amount}
                  onChangeText={(text) => {
                    setAmount(text);
                    setInvalid(false);
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={theme.textSecondary}
                  accessibilityLabel="Amount"
                  onFocus={() => setAmountFocused(true)}
                  onBlur={() => setAmountFocused(false)}
                />
              </View>
              {invalid && <FieldError>Enter an amount greater than 0</FieldError>}
              <FocusInput
                style={[inputStyle, styles.noteInput]}
                value={title}
                onChangeText={setTitle}
                placeholder="Note (optional)"
                accessibilityLabel="Note"
                maxLength={MAX_NOTE_LENGTH}
                placeholderTextColor={theme.textSecondary}
                returnKeyType="done"
                onSubmitEditing={submit}
              />
              <CategoryChips value={category} onChange={setCategory} bleed={Spacing.three} />
              <Button label="Add expense" onPress={submit} />
            </ThemedView>

            <View style={styles.list}>
              {today.length === 0 ? (
                <ThemedText themeColor="textSecondary" style={styles.empty}>
                  Nothing logged today yet.{'\n'}Add your first expense above.
                </ThemedText>
              ) : (
                today.map((expense) => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    currency={currency}
                    onPress={() => (selection.selecting ? selection.toggle(expense.id) : setEditing(expense))}
                    onLongPress={() => {
                      if (!selection.selecting) tap();
                      selection.toggle(expense.id);
                    }}
                    selecting={selection.selecting}
                    selected={selection.has(expense.id)}
                  />
                ))
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {selection.selecting && (
        <SelectionBar
          count={selection.count}
          total={today.length}
          onSelectAll={selection.selectAll}
          onDelete={deleteSelected}
          onCancel={selection.clear}
        />
      )}

      <ExpenseSheet expense={editing} onClose={() => setEditing(null)} />
      <ActionSheet {...sheetProps} />
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.five,
    gap: Spacing.three,
  },
  // The title block may shrink and wrap, so the buttons beside it never get pushed off the edge.
  titles: { flexShrink: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addCard: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.mid,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  amountSymbol: { fontSize: 32, lineHeight: 40, fontWeight: '600' },
  amountField: { paddingVertical: Spacing.one },
  amountInput: { flex: 1, minWidth: 0, fontSize: 32, paddingVertical: Spacing.one },
  noteInput: {},
  list: { gap: Spacing.two },
  empty: { textAlign: 'center', paddingVertical: Spacing.four },
});
