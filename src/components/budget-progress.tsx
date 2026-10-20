import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Numeric, ThemedText } from '@/components/themed-text';
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

/**
 * How much of the monthly budget is used: a title with the budget, the bar, and what is left.
 * Sits inside a SummaryCard, which gives it its rounded bottom edge. Renders nothing without a budget. A screen reader gets one progress bar.
 */
export function BudgetProgress({
  spentCents,
  budgetCents,
  currency,
  allowanceNow,
}: Props) {
  const theme = useTheme();
  const status = budgetStatus(spentCents, budgetCents);
  const fill = useSharedValue(0);

  // The bar grows to its value when it appears and whenever the value changes.
  useEffect(() => {
    fill.set(withTiming(status.ratio, { duration: 450, easing: Easing.out(Easing.cubic) }));
  }, [fill, status.ratio]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));

  if (budgetCents <= 0) return null;

  const color =
    status.tone === 'over' ? theme.danger : status.tone === 'warn' ? theme.warning : theme.accent;

  let message: string;
  if (status.tone === 'over') {
    message = `${formatMoney(-status.remainingCents, currency)} over budget`;
  } else {
    message = `${formatMoney(status.remainingCents, currency)} left this month`;
    if (allowanceNow !== undefined) {
      message += ` · about ${formatMoney(dailyAllowanceCents(status.remainingCents, allowanceNow), currency)} a day`;
    }
    // The bar's color change alone is not enough: say it in words too.
    if (status.tone === 'warn') message = `Almost at your limit · ${message}`;
  }
  const spentOf = `${formatMoney(spentCents, currency)} of ${formatMoney(budgetCents, currency)}`;

  const sentence = (
    <ThemedText type="small" style={[Numeric, status.tone === 'ok' ? null : { color }]}>
      {message}
    </ThemedText>
  );
  const bar = (
    <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
      <Animated.View style={[styles.fill, { backgroundColor: color }, fillStyle]} />
    </View>
  );

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(status.ratio * 100) }}
      accessibilityLabel={`Budget: spent ${spentOf}. ${message}`}
      style={[
        styles.strip,
        { backgroundColor: theme.backgroundElement },
        // A faint line along the top separates the strip from the number above it.
        { boxShadow: [{ offsetX: 0, offsetY: 1, blurRadius: 0, color: theme.edge, inset: true }] },
      ]}>
      {/* Wraps, so on a narrow screen the amounts drop to their own line instead of squeezing the title. */}
      <View style={styles.top}>
        <ThemedText type="smallBold" style={styles.title}>
          Monthly budget
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={Numeric}>
          {formatMoney(budgetCents, currency)}
        </ThemedText>
      </View>
      {bar}
      {sentence}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.mid, gap: Spacing.two },
  top: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    columnGap: Spacing.two,
  },
  title: { flexShrink: 0 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
});
