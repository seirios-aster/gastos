import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { budgetStatus, dailyAllowanceCents } from '@/lib/budget';
import { formatMoney } from '@/lib/money';

type Props = {
  spentCents: number;
  budgetCents: number;
  currency: string;
  /** Pass the current time to also show a per-day allowance (only for the running month). */
  allowanceNow?: number;
};

export function BudgetProgress({ spentCents, budgetCents, currency, allowanceNow }: Props) {
  const theme = useTheme();
  if (budgetCents <= 0) return null;

  const status = budgetStatus(spentCents, budgetCents);
  const color =
    status.tone === 'over' ? theme.danger : status.tone === 'warn' ? theme.warning : theme.accent;

  let message: string;
  if (status.tone === 'over') {
    message = `${formatMoney(-status.remainingCents, currency)} over budget`;
  } else {
    message = `${formatMoney(status.remainingCents, currency)} left`;
    if (allowanceNow !== undefined) {
      message += ` · about ${formatMoney(dailyAllowanceCents(status.remainingCents, allowanceNow), currency)}/day`;
    }
  }

  return (
    <ThemedView
      type="backgroundElement"
      style={styles.card}
      accessible
      accessibilityLabel={`Budget: spent ${formatMoney(spentCents, currency)} of ${formatMoney(budgetCents, currency)}. ${message}`}>
      <View style={styles.top}>
        <ThemedText type="smallBold" style={styles.title}>
          Monthly budget
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatMoney(spentCents, currency)} of {formatMoney(budgetCents, currency)}
        </ThemedText>
      </View>
      <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
        <View style={[styles.fill, { backgroundColor: color, width: `${status.ratio * 100}%` }]} />
      </View>
      <ThemedText type="small" style={status.tone === 'over' ? { color } : undefined}>
        {message}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Spacing.four, padding: Spacing.three, gap: Spacing.two },
  // Wrap, so on a narrow screen the amounts drop to their own line instead of squeezing the title.
  top: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    columnGap: Spacing.two,
  },
  title: { flexShrink: 0 },
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5 },
});
