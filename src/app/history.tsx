import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExpenseRow } from '@/components/expense-row';
import { ExpenseSheet } from '@/components/expense-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { addMonths, isSameMonth, monthLabel, startOfMonth } from '@/lib/dates';
import {
  categoryTotals,
  expensesInMonth,
  groupByDay,
  sumCents,
  type Expense,
} from '@/lib/expenses';
import { formatMoney } from '@/lib/money';

export default function HistoryScreen() {
  const theme = useTheme();
  const now = useNow();
  const { expenses, currency } = useExpenses();

  const [monthTs, setMonthTs] = useState(() => startOfMonth(Date.now()));
  const [editing, setEditing] = useState<Expense | null>(null);

  const monthExpenses = useMemo(() => expensesInMonth(expenses, monthTs), [expenses, monthTs]);
  const sections = useMemo(() => groupByDay(monthExpenses, now), [monthExpenses, now]);
  const breakdown = useMemo(() => categoryTotals(monthExpenses), [monthExpenses]);
  const monthTotal = sumCents(monthExpenses);
  const canGoNext = !isSameMonth(monthTs, now) && monthTs < now;

  const header = (
    <View style={styles.headerContent}>
      <ThemedText type="subtitle">History</ThemedText>

      <ThemedView type="backgroundElement" style={styles.monthRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          hitSlop={12}
          onPress={() => setMonthTs(addMonths(monthTs, -1))}>
          <ThemedText style={styles.arrow}>‹</ThemedText>
        </Pressable>
        <ThemedText type="smallBold">{monthLabel(monthTs)}</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          hitSlop={12}
          disabled={!canGoNext}
          onPress={() => setMonthTs(addMonths(monthTs, 1))}>
          <ThemedText style={[styles.arrow, !canGoNext && styles.disabled]}>›</ThemedText>
        </Pressable>
      </ThemedView>

      <View style={[styles.summary, { backgroundColor: theme.accent }]}>
        <ThemedText type="small" themeColor="onAccent" style={styles.dim}>
          Spent in {monthLabel(monthTs)}
        </ThemedText>
        <ThemedText style={styles.summaryAmount} themeColor="onAccent">
          {formatMoney(monthTotal, currency)}
        </ThemedText>
        <ThemedText type="small" themeColor="onAccent" style={styles.dim}>
          {monthExpenses.length} {monthExpenses.length === 1 ? 'expense' : 'expenses'}
        </ThemedText>
      </View>

      {breakdown.length > 0 && (
        <ThemedView type="backgroundElement" style={styles.breakdown}>
          <ThemedText type="smallBold">By category</ThemedText>
          {breakdown.map(({ category, totalCents, share }) => (
            <View key={category.id} style={styles.breakdownRow}>
              <View style={styles.breakdownTop}>
                <ThemedText type="small">
                  {category.emoji} {category.label}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatMoney(totalCents, currency)} · {Math.round(share * 100)}%
                </ThemedText>
              </View>
              <View style={[styles.barTrack, { backgroundColor: theme.backgroundSelected }]}>
                <View
                  style={[
                    styles.barFill,
                    { backgroundColor: theme.accent, width: `${Math.max(share * 100, 2)}%` },
                  ]}
                />
              </View>
            </View>
          ))}
        </ThemedView>
      )}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.content}
          ListHeaderComponent={header}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <ThemedText type="smallBold">{section.label}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatMoney(section.totalCents, currency)}
              </ThemedText>
            </View>
          )}
          renderItem={({ item }) => (
            <ExpenseRow expense={item} currency={currency} onPress={() => setEditing(item)} />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              No expenses in {monthLabel(monthTs)}.
            </ThemedText>
          }
        />
      </SafeAreaView>

      <ExpenseSheet expense={editing} onClose={() => setEditing(null)} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.five,
  },
  headerContent: { gap: Spacing.three, paddingBottom: Spacing.two },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  arrow: { fontSize: 28, lineHeight: 34, paddingHorizontal: Spacing.two },
  disabled: { opacity: 0.25 },
  summary: { borderRadius: Spacing.four, padding: Spacing.four, gap: Spacing.one },
  dim: { opacity: 0.85 },
  summaryAmount: { fontSize: 40, lineHeight: 48, fontWeight: '700' },
  breakdown: { borderRadius: Spacing.four, padding: Spacing.three, gap: Spacing.three - 4 },
  breakdownRow: { gap: Spacing.one + 2 },
  breakdownTop: { flexDirection: 'row', justifyContent: 'space-between' },
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  separator: { height: Spacing.two },
  empty: { textAlign: 'center', paddingVertical: Spacing.five },
});
