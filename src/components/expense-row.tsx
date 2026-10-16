import { Pressable, StyleSheet, View } from 'react-native';

import { Numeric, ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
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
      accessibilityLabel={`${title}, ${category.label}, ${formatMoney(expense.amountCents, currency)}, ${timeLabel(expense.createdAt)}`}
      accessibilityHint="Opens the editor"
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
        <ThemedText type="defaultBold" style={Numeric}>
          {formatMoney(expense.amountCents, currency)}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.mid,
    borderRadius: Radius.row,
    padding: Spacing.mid,
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
