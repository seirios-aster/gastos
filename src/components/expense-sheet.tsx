import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { CategoryChips } from '@/components/category-chips';
import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { addDays, dayLabel, startOfDay, timeLabel } from '@/lib/dates';
import type { Expense } from '@/lib/expenses';
import { centsToInput, parseAmountToCents } from '@/lib/money';

type Props = {
  /** The expense being edited, or null when the sheet is closed. */
  expense: Expense | null;
  onClose: () => void;
};

export function ExpenseSheet({ expense, onClose }: Props) {
  return (
    <Sheet visible={expense !== null} title="Edit expense" onClose={onClose}>
      {/* keyed so the form restarts from the expense's values each time it opens */}
      {expense && <EditForm key={expense.id} expense={expense} onClose={onClose} />}
    </Sheet>
  );
}

function EditForm({ expense, onClose }: { expense: Expense; onClose: () => void }) {
  const theme = useTheme();
  const { currency, updateExpense, deleteExpense } = useExpenses();
  const [amount, setAmount] = useState(centsToInput(expense.amountCents));
  const [title, setTitle] = useState(expense.title);
  const [category, setCategory] = useState(expense.category);
  const [createdAt, setCreatedAt] = useState(expense.createdAt);
  const [invalid, setInvalid] = useState(false);

  const now = useNow();
  const canGoLater = startOfDay(addDays(createdAt, 1)) <= startOfDay(now);

  const inputStyle = [
    styles.input,
    { color: theme.text, backgroundColor: theme.backgroundElement },
  ];

  async function save() {
    const amountCents = parseAmountToCents(amount);
    if (amountCents === null) {
      setInvalid(true);
      return;
    }
    await updateExpense(expense.id, { title: title.trim(), amountCents, category, createdAt });
    onClose();
  }

  function confirmDelete() {
    Alert.alert('Delete this expense?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteExpense(expense.id);
          onClose();
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <View style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            Amount
          </ThemedText>
          <View style={styles.amountRow}>
            {currency ? <ThemedText style={styles.currency}>{currency}</ThemedText> : null}
            <TextInput
              style={[inputStyle, styles.amountInput]}
              value={amount}
              onChangeText={(text) => {
                setAmount(text);
                setInvalid(false);
              }}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={theme.textSecondary}
            />
          </View>
          {invalid && (
            <ThemedText type="small" themeColor="danger">
              Enter an amount greater than 0
            </ThemedText>
          )}
        </View>

        <View style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            Note
          </ThemedText>
          <TextInput
            style={inputStyle}
            value={title}
            onChangeText={setTitle}
            placeholder="What was it for?"
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        <View style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            Category
          </ThemedText>
          <CategoryChips value={category} onChange={setCategory} />
        </View>

        <View style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            Date
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.dateRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous day"
              hitSlop={12}
              onPress={() => setCreatedAt(addDays(createdAt, -1))}>
              <ThemedText style={styles.arrow}>‹</ThemedText>
            </Pressable>
            <ThemedText style={styles.dateText}>
              {dayLabel(createdAt, now)} · {timeLabel(createdAt)}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next day"
              hitSlop={12}
              disabled={!canGoLater}
              onPress={() => setCreatedAt(addDays(createdAt, 1))}>
              <ThemedText style={[styles.arrow, !canGoLater && styles.disabled]}>›</ThemedText>
            </Pressable>
          </ThemedView>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={save}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.accent },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" themeColor="onAccent">
            Save changes
          </ThemedText>
        </Pressable>

        <Pressable accessibilityRole="button" onPress={confirmDelete} style={styles.deleteButton}>
          <ThemedText type="smallBold" themeColor="danger">
            Delete expense
          </ThemedText>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  field: { gap: Spacing.one + 2 },
  input: {
    borderRadius: Spacing.three - 4,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three - 4,
    fontSize: 16,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  amountInput: { flex: 1, minWidth: 0, fontSize: 28, fontWeight: '600' },
  currency: { fontSize: 28, lineHeight: 34, fontWeight: '600' },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.three - 4,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  dateText: { flex: 1, textAlign: 'center' },
  arrow: { fontSize: 28, lineHeight: 34, paddingHorizontal: Spacing.two },
  disabled: { opacity: 0.25 },
  button: {
    alignItems: 'center',
    borderRadius: Spacing.three - 4,
    paddingVertical: Spacing.three - 2,
    marginTop: Spacing.two,
  },
  pressed: { opacity: 0.8 },
  deleteButton: { alignItems: 'center', paddingVertical: Spacing.three },
});
