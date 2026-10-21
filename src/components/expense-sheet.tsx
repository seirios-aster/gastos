import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { FocusInput } from '@/components/focus-input';
import { ActionSheet } from '@/components/action-sheet';
import { Button } from '@/components/button';
import { CategoryChips } from '@/components/category-chips';
import { FieldError } from '@/components/field-error';
import { confirm, info } from '@/components/notices';
import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, Touch } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { useInputStyle } from '@/hooks/use-input-style';
import { useNow } from '@/hooks/use-now';
import { useSheetNotice } from '@/hooks/use-sheet-notice';
import { useTheme } from '@/hooks/use-theme';
import { addDays, dayLabel, startOfDay, timeLabel } from '@/lib/dates';
import { MAX_NOTE_LENGTH, type Expense } from '@/lib/expenses';
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
  // Messages use the app's own sheet; it sits inside this modal, since one modal can't open over another.
  const { notify, sheetProps } = useSheetNotice();
  const [amount, setAmount] = useState(centsToInput(expense.amountCents));
  const [title, setTitle] = useState(expense.title);
  const [category, setCategory] = useState(expense.category);
  const [createdAt, setCreatedAt] = useState(expense.createdAt);
  const [invalid, setInvalid] = useState(false);
  const saving = useRef(false);

  const now = useNow();
  const canGoLater = startOfDay(addDays(createdAt, 1)) <= startOfDay(now);

  const fieldLook = useInputStyle();
  const inputStyle = [fieldLook, styles.input];

  async function save() {
    if (saving.current) return;
    const amountCents = parseAmountToCents(amount);
    if (amountCents === null) {
      setInvalid(true);
      return;
    }
    saving.current = true;
    try {
      await updateExpense(expense.id, { title: title.trim(), amountCents, category, createdAt });
      onClose();
    } catch (error) {
      console.warn('Could not save expense', error);
      notify(info('Could not save', 'Something went wrong. Please try again.'));
    } finally {
      saving.current = false;
    }
  }

  function confirmDelete() {
    notify(
      confirm({
        title: 'Delete this expense?',
        message: 'You can undo this for a few seconds afterwards.',
        confirmLabel: 'Delete',
        cancelLabel: 'Keep it',
        destructive: true,
        onConfirm: async () => {
          try {
            await deleteExpense(expense.id);
            onClose();
          } catch (error) {
            console.warn('Could not delete the expense', error);
            notify(info('Could not delete', 'Please try again.'));
          }
        },
      })
    );
  }

  return (
    <>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
              <FocusInput
                style={[inputStyle, styles.amountInput]}
                value={amount}
                onChangeText={(text) => {
                  setAmount(text);
                  setInvalid(false);
                }}
                keyboardType="decimal-pad"
                placeholder="0.00"
                accessibilityLabel="Amount"
                placeholderTextColor={theme.textSecondary}
              />
            </View>
            {invalid && <FieldError>Enter an amount greater than 0</FieldError>}
          </View>

          <View style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">
              Note
            </ThemedText>
            <FocusInput
              style={inputStyle}
              value={title}
              onChangeText={setTitle}
              placeholder="What was it for?"
              accessibilityLabel="Note"
              maxLength={MAX_NOTE_LENGTH}
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">
              Category
            </ThemedText>
            <CategoryChips value={category} onChange={setCategory} bleed={Spacing.four} />
          </View>

          <View style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">
              Date
            </ThemedText>
            <ThemedView type="backgroundElement" style={styles.dateRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous day"
                style={({ pressed }) => [styles.arrowButton, pressed && styles.pressed]}
                onPress={() => setCreatedAt(addDays(createdAt, -1))}>
                <ThemedText style={styles.arrow}>‹</ThemedText>
              </Pressable>
              <ThemedText style={styles.dateText}>
                {dayLabel(createdAt, now)} · {timeLabel(createdAt)}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next day"
                disabled={!canGoLater}
                style={({ pressed }) => [styles.arrowButton, pressed && styles.pressed]}
                onPress={() => setCreatedAt(addDays(createdAt, 1))}>
                <ThemedText style={[styles.arrow, !canGoLater && styles.disabled]}>›</ThemedText>
              </Pressable>
            </ThemedView>
          </View>

          <Button icon="save" label="Save changes" onPress={save} style={styles.save} />
          <Button icon="delete" variant="danger" label="Delete expense" onPress={confirmDelete} />
        </ScrollView>
      </KeyboardAvoidingView>
    <ActionSheet {...sheetProps} />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  field: { gap: Spacing.two },
  input: {
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.mid,
    fontSize: 16,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  amountInput: { flex: 1, minWidth: 0, fontSize: 28, fontWeight: '600' },
  currency: { fontSize: 28, lineHeight: 34, fontWeight: '600' },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  dateText: { flex: 1, textAlign: 'center' },
  arrowButton: { minWidth: Touch.min, minHeight: Touch.min, alignItems: 'center', justifyContent: 'center' },
  arrow: { fontSize: 28, lineHeight: 34 },
  disabled: { opacity: 0.25 },
  save: { marginTop: Spacing.two },
  pressed: { opacity: 0.8 },
});
