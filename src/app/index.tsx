import { useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BudgetProgress } from '@/components/budget-progress';
import { Button } from '@/components/button';
import { CategoryChips } from '@/components/category-chips';
import { ExpenseRow } from '@/components/expense-row';
import { ExpenseSheet } from '@/components/expense-sheet';
import { FieldError } from '@/components/field-error';
import { QuickAddBar } from '@/components/quick-add-bar';
import { HeaderActions } from '@/components/header-actions';
import { SummaryCard } from '@/components/summary-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { useNow } from '@/hooks/use-now';
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
import { centsToInput, formatMoney, parseAmountToCents } from '@/lib/money';
import type { Draft } from '@/lib/quick-entry';

export default function TodayScreen() {
  const theme = useTheme();
  const now = useNow();
  const { expenses, categories, currency, budgetCents, lastCategory, addExpense, setLastCategory } =
    useExpenses();

  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [chosenCategory, setCategory] = useState(lastCategory || 'food');
  const [invalid, setInvalid] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const submitting = useRef(false);

  // The chosen category may have been deleted in Settings; fall back to the first one.
  const category = categories.some((c) => c.id === chosenCategory)
    ? chosenCategory
    : (categories[0]?.id ?? 'other');

  const today = expensesOnDay(expenses, now);
  const monthSpent = sumCents(expensesInMonth(expenses, now));
  const todayTotal = sumCents(today);
  const yesterdayTotal = sumCents(expensesOnDay(expenses, addDays(now, -1)));

  /** Fill the form from a spoken or scanned draft; the user still taps Add to confirm. */
  function applyDraft(draft: Draft) {
    setAmount(draft.amountCents === null ? '' : centsToInput(draft.amountCents));
    setTitle(draft.title.slice(0, MAX_NOTE_LENGTH));
    setCategory(draft.category);
    setInvalid(false);
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
      Alert.alert('Could not save', 'The expense was not saved. Please try again.');
    } finally {
      submitting.current = false;
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag">
            <View style={styles.header}>
              <View>
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
                variant="compact"
                spentCents={monthSpent}
                budgetCents={budgetCents}
                currency={currency}
                allowanceNow={now}
              />
            </SummaryCard>

            <QuickAddBar onDraft={applyDraft} />

            <ThemedView type="backgroundElement" style={styles.addCard}>
              <View style={styles.amountRow}>
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
                />
              </View>
              {invalid && <FieldError>Enter an amount greater than 0</FieldError>}
              <TextInput
                style={[
                  styles.noteInput,
                  { color: theme.text, backgroundColor: theme.backgroundSelected },
                ]}
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
                    onPress={() => setEditing(expense)}
                  />
                ))
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <ExpenseSheet expense={editing} onClose={() => setEditing(null)} />
    </ThemedView>
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
  amountInput: { flex: 1, minWidth: 0, fontSize: 32, paddingVertical: Spacing.one },
  noteInput: {
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.mid,
    fontSize: 16,
  },
  list: { gap: Spacing.two },
  empty: { textAlign: 'center', paddingVertical: Spacing.four },
});
