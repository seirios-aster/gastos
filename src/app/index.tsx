import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BudgetProgress } from '@/components/budget-progress';
import { CategoryChips } from '@/components/category-chips';
import { ExpenseRow } from '@/components/expense-row';
import { ExpenseSheet } from '@/components/expense-sheet';
import { FieldError } from '@/components/field-error';
import { SettingsButton } from '@/components/settings-button';
import { SummaryCard } from '@/components/summary-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
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
import { formatMoney, parseAmountToCents } from '@/lib/money';

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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
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
                <ThemedText type="subtitle">Today</ThemedText>
              </View>
              <SettingsButton />
            </View>

            <SummaryCard
              label="Spent today"
              amount={formatMoney(todayTotal, currency)}
              footer={`${today.length} ${today.length === 1 ? 'expense' : 'expenses'} · Yesterday ${formatMoney(yesterdayTotal, currency)}`}
            />

            <BudgetProgress
              spentCents={monthSpent}
              budgetCents={budgetCents}
              currency={currency}
              allowanceNow={now}
            />

            <ThemedView type="backgroundElement" style={styles.addCard}>
              <View style={styles.amountRow}>
                {currency ? <ThemedText style={styles.amountSymbol}>{currency}</ThemedText> : null}
                <TextInput
                  style={[styles.amountInput, { color: theme.text }]}
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
                maxLength={MAX_NOTE_LENGTH}
                placeholderTextColor={theme.textSecondary}
                returnKeyType="done"
                onSubmitEditing={submit}
              />
              <CategoryChips value={category} onChange={setCategory} />
              <Pressable
                accessibilityRole="button"
                onPress={submit}
                style={({ pressed }) => [
                  styles.addButton,
                  { backgroundColor: theme.accent },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" themeColor="onAccent">
                  Add expense
                </ThemedText>
              </Pressable>
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
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.three - 4,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  amountSymbol: { fontSize: 32, lineHeight: 40, fontWeight: '600' },
  amountInput: { flex: 1, minWidth: 0, fontSize: 32, fontWeight: '600', paddingVertical: Spacing.one },
  noteInput: {
    borderRadius: Spacing.three - 4,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three - 4,
    fontSize: 16,
  },
  addButton: {
    alignItems: 'center',
    borderRadius: Spacing.three - 4,
    paddingVertical: Spacing.three - 2,
  },
  pressed: { opacity: 0.8 },
  list: { gap: Spacing.two },
  empty: { textAlign: 'center', paddingVertical: Spacing.four },
});
