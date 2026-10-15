import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { timeLabel } from '@/lib/dates';
import { getCategory, type Expense } from '@/lib/expenses';
import { formatMoney } from '@/lib/money';

type Props = {
  expense: Expense;
  currency: string;
  onPress: () => void;
};

export function ExpenseRow({ expense, currency, onPress }: Props) {
  const { categories } = useExpenses();
  const category = getCategory(categories, expense.category);
  const title = expense.title || category.label;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${formatMoney(expense.amountCents, currency)}. Tap to edit`}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.row}>
        <ThemedView type="backgroundSelected" style={styles.icon}>
          <ThemedText style={styles.emoji}>{category.emoji}</ThemedText>
        </ThemedView>
        <View style={styles.text}>
          <ThemedText numberOfLines={1}>{title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {category.label} · {timeLabel(expense.createdAt)}
          </ThemedText>
        </View>
        <ThemedText type="smallBold">{formatMoney(expense.amountCents, currency)}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    borderRadius: Spacing.three,
    padding: Spacing.three - 4,
  },
  icon: {
    minWidth: 40,
    minHeight: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 18, lineHeight: 24 },
  text: { flex: 1 },
});
