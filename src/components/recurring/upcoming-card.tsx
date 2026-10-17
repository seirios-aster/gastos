import { StyleSheet, View } from 'react-native';

import { BarChart, type Bar } from '@/components/bar-chart';
import { Numeric, ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { addDays, dueLabel, shortDateLabel } from '@/lib/dates';
import { getCategory, type Category } from '@/lib/expenses';
import { formatMoney } from '@/lib/money';
import {
  nextCharges,
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
/** "Next: Netflix on Nov 16 · ₱700.00", or "Next: 5 charges on Nov 16 · ₱715.00" when several share the day. */
function laterText(
  later: NonNullable<ReturnType<typeof nextCharges<Recurring>>>,
  categories: Category[],
  currency: string
): string {
  const when = `on ${shortDateLabel(later.due)}`;
  const money = formatMoney(later.totalCents, currency);
  if (later.items.length > 1) return `Next: ${later.items.length} charges ${when} · ${money}`;
  const [only] = later.items;
  return `Next: ${only.title || getCategory(categories, only.category).label} ${when} · ${money}`;
}

export function UpcomingCard({ items, now }: Props) {
  const { categories, currency } = useExpenses();

  const upcoming = upcomingOccurrences(items, now, DAYS);
  const totals = upcomingDailyTotals(items, now, DAYS);
  const total = totals.reduce((sum, value) => sum + value, 0);
  const next = summarizeRecurring(items, now, DAYS).next;

  if (upcoming.length === 0) {
    const later = nextCharges(items, now);
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold" accessibilityRole="header">
          Next 30 days
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Nothing is due in the next 30 days.
          {later ? ` ${laterText(later, categories, currency)}` : ''}
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
