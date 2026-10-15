import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarChart, type Bar } from '@/components/bar-chart';
import { BudgetProgress } from '@/components/budget-progress';
import { ExpenseRow } from '@/components/expense-row';
import { ExpenseSheet } from '@/components/expense-sheet';
import { Segmented } from '@/components/segmented';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import {
  addMonths,
  isSameMonth,
  monthLabel,
  shortDateLabel,
  shortMonthLabel,
  startOfMonth,
} from '@/lib/dates';
import {
  categoryTotals,
  dailyTotals,
  expensesInMonth,
  groupByDay,
  monthlyTotals,
  searchExpenses,
  sumCents,
  type Expense,
} from '@/lib/expenses';
import { formatMoney } from '@/lib/money';

type ChartMode = 'days' | 'months';

const DAY_LABELS = new Set([1, 8, 15, 22, 29]);

export default function HistoryScreen() {
  const theme = useTheme();
  const now = useNow();
  const { expenses, categories, currency, budgetCents } = useExpenses();

  const [monthTs, setMonthTs] = useState(() => startOfMonth(Date.now()));
  const [query, setQuery] = useState('');
  const [chartMode, setChartMode] = useState<ChartMode>('days');
  const [editing, setEditing] = useState<Expense | null>(null);

  const searching = query.trim().length > 0;
  const isCurrentMonth = isSameMonth(monthTs, now);
  const canGoNext = !isCurrentMonth && monthTs < now;

  const monthExpenses = useMemo(() => expensesInMonth(expenses, monthTs), [expenses, monthTs]);
  const shown = useMemo(
    () => (searching ? searchExpenses(expenses, categories, query) : monthExpenses),
    [searching, expenses, categories, query, monthExpenses]
  );
  const sections = useMemo(() => groupByDay(shown, now), [shown, now]);
  const breakdown = useMemo(
    () => categoryTotals(monthExpenses, categories),
    [monthExpenses, categories]
  );
  const monthTotal = sumCents(monthExpenses);

  const chart = useMemo(() => {
    if (chartMode === 'months') {
      const months = monthlyTotals(expenses, monthTs, 6);
      const bars: Bar[] = months.map((m, i) => ({
        key: String(m.monthTs),
        value: m.totalCents,
        label: shortMonthLabel(m.monthTs),
        highlight: i === months.length - 1,
      }));
      const average = Math.round(months.reduce((s, m) => s + m.totalCents, 0) / months.length);
      return {
        bars,
        caption: `6-month average: ${formatMoney(average, currency)}`,
        a11y: `Spending for the last 6 months, ending ${monthLabel(monthTs)}`,
      };
    }

    const daily = dailyTotals(expenses, monthTs);
    const today = new Date(now).getDate();
    const bars: Bar[] = daily.map((value, i) => ({
      key: String(i + 1),
      value,
      label: DAY_LABELS.has(i + 1) ? String(i + 1) : undefined,
      highlight: isCurrentMonth && i + 1 === today,
    }));
    const peak = Math.max(...daily);
    let caption = 'No spending this month';
    if (peak > 0) {
      const peakDay = daily.indexOf(peak) + 1;
      const peakDate = shortDateLabel(new Date(monthTs).setDate(peakDay));
      const elapsed = isCurrentMonth ? today : daily.length;
      const average = Math.round(monthTotal / elapsed);
      caption = `Highest: ${formatMoney(peak, currency)} on ${peakDate} · Avg ${formatMoney(average, currency)}/day`;
    }
    return {
      bars,
      caption,
      a11y: `Daily spending in ${monthLabel(monthTs)}`,
    };
  }, [chartMode, expenses, monthTs, now, isCurrentMonth, monthTotal, currency]);

  const header = (
    <View style={styles.headerContent}>
      <ThemedText type="subtitle">History</ThemedText>

      <View style={styles.searchRow}>
        <TextInput
          style={[styles.search, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          value={query}
          onChangeText={setQuery}
          placeholder="Search notes, categories, amounts"
          placeholderTextColor={theme.textSecondary}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Search expenses"
        />
        {searching && (
          <Pressable accessibilityRole="button" hitSlop={10} onPress={() => setQuery('')}>
            <ThemedText type="linkPrimary">Clear</ThemedText>
          </Pressable>
        )}
      </View>

      {searching ? (
        <ThemedText type="small" themeColor="textSecondary">
          {shown.length} {shown.length === 1 ? 'result' : 'results'} across all months ·{' '}
          {formatMoney(sumCents(shown), currency)}
        </ThemedText>
      ) : (
        <>
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

          <BudgetProgress
            spentCents={monthTotal}
            budgetCents={budgetCents}
            currency={currency}
            allowanceNow={isCurrentMonth ? now : undefined}
          />

          <ThemedView type="backgroundElement" style={styles.card}>
            <View style={styles.cardTop}>
              <ThemedText type="smallBold">Spending</ThemedText>
              <View style={styles.toggle}>
                <Segmented
                  options={[
                    { value: 'days', label: 'Days' },
                    { value: 'months', label: 'Months' },
                  ]}
                  value={chartMode}
                  onChange={setChartMode}
                />
              </View>
            </View>
            <BarChart bars={chart.bars} accessibilityLabel={chart.a11y} />
            <ThemedText type="small" themeColor="textSecondary">
              {chart.caption}
            </ThemedText>
          </ThemedView>

          {breakdown.length > 0 && (
            <ThemedView type="backgroundElement" style={styles.card}>
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
        </>
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
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={header}
          initialNumToRender={20}
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
              {searching ? `No matches for “${query.trim()}”.` : `No expenses in ${monthLabel(monthTs)}.`}
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
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  search: {
    flex: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three - 4,
    fontSize: 16,
  },
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
  card: { borderRadius: Spacing.four, padding: Spacing.three, gap: Spacing.three - 4 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggle: { width: 176 },
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
