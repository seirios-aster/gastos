import { StyleSheet, View } from 'react-native';

import { BarChart, type Bar } from '@/components/bar-chart';
import { Numeric, ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { addDays, dueLabel, shortDateLabel } from '@/lib/dates';
import { getCategory } from '@/lib/expenses';
import { formatMoney } from '@/lib/money';
import {
  summarizeRecurring,
  upcomingDailyTotals,
  upcomingOccurrences,
  type Recurring,
} from '@/lib/recurring';

const DAYS = 30;

type Props = {
  items: Recurring[];
  now: number;
};

/** "Next 30 days": a bar for each day with money leaving, and a line about what is next. */
export function UpcomingCard({ items, now }: Props) {
  const { categories, currency } = useExpenses();

  const upcoming = upcomingOccurrences(items, now, DAYS);
  const totals = upcomingDailyTotals(items, now, DAYS);
  const total = totals.reduce((sum, value) => sum + value, 0);
  const next = summarizeRecurring(items, now, DAYS).next;

  if (upcoming.length === 0) {
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold" accessibilityRole="header">
          Next 30 days
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Nothing is due in the next 30 days.
        </ThemedText>
      </ThemedView>
    );
  }

  const bars: Bar[] = totals.map((value, i) => ({
    key: String(i),
    value,
    label: i === 0 ? 'Today' : i % 7 === 0 ? shortDateLabel(addDays(now, i)) : undefined,
    highlight: i === 0,
  }));
  const nextCategory = next ? getCategory(categories, next.item.category) : null;
  const charges = `${upcoming.length} ${upcoming.length === 1 ? 'charge' : 'charges'}`;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      {/* Wraps, so on a narrow screen the total drops under the title. */}
      <View style={styles.top}>
        <ThemedText type="smallBold" accessibilityRole="header">
          Next 30 days
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={Numeric}>
          {formatMoney(total, currency)} · {charges}
        </ThemedText>
      </View>
      <BarChart
        bars={bars}
        height={56}
        accessibilityLabel={`${charges} totalling ${formatMoney(total, currency)} in the next 30 days`}
      />
      {next && nextCategory ? (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          Next up: {nextCategory.emoji} {next.item.title || nextCategory.label} · {dueLabel(next.due, now)}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.card, padding: Spacing.three, gap: Spacing.two },
  top: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    columnGap: Spacing.two,
  },
});
