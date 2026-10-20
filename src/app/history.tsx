import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FocusInput } from '@/components/focus-input';
import { BarChart, type Bar } from '@/components/bar-chart';
import { BudgetProgress } from '@/components/budget-progress';
import { DayCalendar } from '@/components/day-calendar';
import { ActionSheet } from '@/components/action-sheet';
import { ExpenseRow } from '@/components/expense-row';
import { ExpenseSheet } from '@/components/expense-sheet';
import { Segmented } from '@/components/segmented';
import { GlassScreen } from '@/components/glass-screen';
import { HeaderActions } from '@/components/header-actions';
import { confirmDeleteExpenses, info } from '@/components/notices';
import { SelectionBar } from '@/components/selection-bar';
import { SummaryCard } from '@/components/summary-card';
import { Numeric, ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing, Touch } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { useInputStyle } from '@/hooks/use-input-style';
import { useNow } from '@/hooks/use-now';
import { useSelection } from '@/hooks/use-selection';
import { useSheetNotice } from '@/hooks/use-sheet-notice';
import { useTheme } from '@/hooks/use-theme';
import { tap } from '@/lib/haptics';
import { projectedMonthCents } from '@/lib/budget';
import { dayOfMonth, defaultDay, isPickable } from '@/lib/calendar';
import {
  addMonths,
  dayLabel,
  isSameDay,
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
  getCategory,
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
  const inputStyle = useInputStyle();
  const now = useNow();
  const { expenses, categories, currency, budgetCents, deleteExpenses } = useExpenses();
  const { notify, sheetProps } = useSheetNotice();

  const [monthTs, setMonthTs] = useState(() => startOfMonth(Date.now()));
  const [query, setQuery] = useState('');
  const [chartMode, setChartMode] = useState<ChartMode>('days');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);
  // The day picked on the calendar. It belongs to one month, so changing month falls back to the default.
  const [pick, setPick] = useState<{ monthTs: number; day: number } | null>(null);

  const searching = query.trim().length > 0;
  const isCurrentMonth = isSameMonth(monthTs, now);
  const canGoNext = !isCurrentMonth && monthTs < now;

  const monthExpenses = useMemo(() => expensesInMonth(expenses, monthTs), [expenses, monthTs]);
  const breakdown = useMemo(
    () => categoryTotals(monthExpenses, categories),
    [monthExpenses, categories]
  );
  // The filter lapses by itself once its category has no expenses left in the month on screen.
  const activeFilter = breakdown.some((b) => b.category.id === categoryFilter)
    ? categoryFilter
    : null;
  const shown = useMemo(() => {
    if (searching) return searchExpenses(expenses, categories, query);
    return activeFilter
      ? monthExpenses.filter((e) => getCategory(categories, e.category).id === activeFilter)
      : monthExpenses;
  }, [searching, expenses, categories, query, monthExpenses, activeFilter]);
  const day = pick && pick.monthTs === monthTs ? pick.day : defaultDay(monthTs, now);
  // The month's list is one day at a time (picked on the calendar); a search covers everything.
  const dayExpenses = useMemo(() => {
    if (day === null) return [];
    const ts = dayOfMonth(monthTs, day);
    return shown.filter((e) => isSameDay(e.createdAt, ts));
  }, [shown, day, monthTs]);
  const listed = searching ? shown : dayExpenses;
  const sections = useMemo(() => groupByDay(listed, now), [listed, now]);
  const dayTotals = useMemo(() => dailyTotals(shown, monthTs), [shown, monthTs]);
  const dayBreakdown = useMemo(() => categoryTotals(dayExpenses, categories), [dayExpenses, categories]);
  const shownIds = useMemo(() => listed.map((e) => e.id), [listed]);
  const selection = useSelection(shownIds);
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

  const projected = isCurrentMonth ? projectedMonthCents(monthTotal, now) : null;

  const header = (
    <View style={styles.headerContent}>
      <View style={styles.titleRow}>
        <ThemedText type="subtitle" accessibilityRole="header">
          History
        </ThemedText>
        <HeaderActions />
      </View>

      {!searching && (
        <>
          <ThemedView type="backgroundElement" style={styles.monthRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              onPress={() => setMonthTs(addMonths(monthTs, -1))}
              style={({ pressed }) => [styles.arrowButton, pressed && styles.pressed]}>
              <ThemedText style={styles.arrow}>‹</ThemedText>
            </Pressable>
            <ThemedText type="smallBold">{monthLabel(monthTs)}</ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next month"
              disabled={!canGoNext}
              onPress={() => setMonthTs(addMonths(monthTs, 1))}
              style={({ pressed }) => [styles.arrowButton, pressed && styles.pressed]}>
              <ThemedText style={[styles.arrow, !canGoNext && styles.disabled]}>›</ThemedText>
            </Pressable>
          </ThemedView>

          <SummaryCard
            label={`Spent in ${monthLabel(monthTs)}`}
            amount={formatMoney(monthTotal, currency)}
            footer={
              `${monthExpenses.length} ${monthExpenses.length === 1 ? 'expense' : 'expenses'}` +
              (projected === null ? '' : ` · On pace for ${formatMoney(projected, currency)}`)
            }>
            <BudgetProgress
              spentCents={monthTotal}
              budgetCents={budgetCents}
              currency={currency}
              allowanceNow={isCurrentMonth ? now : undefined}
            />
          </SummaryCard>

          {/* Nothing to chart before the very first expense; a month with none still shows it. */}
          {expenses.length > 0 && (
          <ThemedView type="backgroundElement" blur style={styles.card}>
            <View style={styles.cardTop}>
              <ThemedText type="smallBold">Spending</ThemedText>
              <View style={styles.toggle}>
                <Segmented
                  accessibilityLabel="Chart range"
                  options={[
                    { value: 'days', label: 'Days' },
                    { value: 'months', label: 'Months' },
                  ]}
                  value={chartMode}
                  onChange={setChartMode}
                />
              </View>
            </View>
            <BarChart
              bars={chart.bars}
              accessibilityLabel={`${chart.a11y}. ${chart.caption}`}
              // Tapping a day's bar opens that day below (the calendar does the same for screen readers).
              onPickBar={
                chartMode === 'days'
                  ? (key) => {
                      const tapped = Number(key);
                      if (isPickable(monthTs, tapped, now)) setPick({ monthTs, day: tapped });
                    }
                  : undefined
              }
            />
            <ThemedText type="small" themeColor="textSecondary" style={Numeric}>
              {chart.caption}
            </ThemedText>
          </ThemedView>
          )}

          {breakdown.length > 0 && (
            <ThemedView type="backgroundElement" blur style={styles.card}>
              <ThemedText type="smallBold">By category</ThemedText>
              {breakdown.map(({ category, totalCents, share }) => {
                const selected = category.id === activeFilter;
                return (
                  <Pressable
                    key={category.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityHint={
                      selected ? 'Shows all categories' : 'Lists only this category below'
                    }
                    onPress={() => setCategoryFilter(selected ? null : category.id)}
                    style={({ pressed }) => [
                      styles.breakdownRow,
                      selected && { backgroundColor: theme.background },
                      pressed && styles.pressed,
                    ]}>
                    <View style={styles.breakdownTop}>
                      <ThemedText type="small">
                        {category.emoji} {category.label}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary" style={Numeric}>
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
                  </Pressable>
                );
              })}
            </ThemedView>
          )}
        </>
      )}

      {/* The search sits between the month's overview and the calendar: both are ways to find an
          expense. It is always in the same place in the tree, so the keyboard stays up while typing. */}
      <View style={styles.searchRow}>
        <FocusInput
          style={[inputStyle, styles.search]}
          value={query}
          onChangeText={setQuery}
          placeholder="Search notes, categories, amounts"
          placeholderTextColor={theme.textSecondary}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Search expenses"
        />
        {searching && (
          <Pressable
            accessibilityRole="button"
            onPress={() => setQuery('')}
            style={({ pressed }) => [styles.clear, pressed && styles.pressed]}>
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
          <DayCalendar
            monthTs={monthTs}
            totals={dayTotals}
            selectedDay={day}
            now={now}
            currency={currency}
            onPick={(next) => setPick({ monthTs, day: next })}
          />

          {day !== null && dayBreakdown.length > 0 && (
            <ThemedView type="backgroundElement" blur style={styles.card}>
              <View style={styles.cardTop}>
                <ThemedText type="smallBold">{dayLabel(dayOfMonth(monthTs, day), now)}</ThemedText>
                <ThemedText type="smallBold" style={Numeric}>
                  {formatMoney(sumCents(dayExpenses), currency)}
                </ThemedText>
              </View>
              {dayBreakdown.map(({ category, totalCents }) => (
                <View key={category.id} style={styles.breakdownTop}>
                  <ThemedText type="small">
                    {category.emoji} {category.label}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={Numeric}>
                    {formatMoney(totalCents, currency)}
                  </ThemedText>
                </View>
              ))}
            </ThemedView>
          )}
        </>
      )}
    </View>
  );

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

  return (
    <GlassScreen style={styles.container}>
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
          // A picked day already has its own card above, so only a search needs the day headings.
          renderSectionHeader={({ section }) =>
            searching ? (
              <View style={styles.sectionHeader}>
                <ThemedText type="smallBold">{section.label}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={Numeric}>
                  {formatMoney(section.totalCents, currency)}
                </ThemedText>
              </View>
            ) : null
          }
          // Rows are redrawn when what is picked changes.
          extraData={selection.ids}
          renderItem={({ item }) => (
            <ExpenseRow
              expense={item}
              currency={currency}
              onPress={() => (selection.selecting ? selection.toggle(item.id) : setEditing(item))}
              onLongPress={() => {
                if (!selection.selecting) tap();
                selection.toggle(item.id);
              }}
              selecting={selection.selecting}
              selected={selection.has(item.id)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              {searching
                ? `No matches for “${query.trim()}”.`
                : day === null
                  ? isCurrentMonth
                    ? "Earlier days show up here. Today's spending is in the Today tab."
                    : `No expenses in ${monthLabel(monthTs)}.`
                  : `Nothing spent on ${shortDateLabel(dayOfMonth(monthTs, day))}${activeFilter ? ' in this category' : ''}.`}
            </ThemedText>
          }
        />
      </SafeAreaView>

      {selection.selecting && (
        <SelectionBar
          count={selection.count}
          total={shownIds.length}
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
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.five,
  },
  headerContent: { gap: Spacing.three, paddingBottom: Spacing.two },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  clear: { minWidth: Touch.min, minHeight: Touch.min, alignItems: 'center', justifyContent: 'center' },
  search: { flex: 1 },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.row,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  arrowButton: { minWidth: Touch.min, minHeight: Touch.min, alignItems: 'center', justifyContent: 'center' },
  arrow: { fontSize: 28, lineHeight: 34 },
  disabled: { opacity: 0.25 },
  card: { borderRadius: Radius.card, padding: Spacing.three, gap: Spacing.mid },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggle: { minWidth: 176 },
  // The negative margin lets the selected highlight reach past the text without moving it.
  breakdownRow: {
    gap: Spacing.two,
    marginHorizontal: -Spacing.two,
    padding: Spacing.two,
    borderRadius: Radius.control,
  },
  pressed: { opacity: 0.8 },
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
