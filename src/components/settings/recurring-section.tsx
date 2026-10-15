import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { RecurringSheet } from '@/components/recurring-sheet';
import { Section } from '@/components/settings/section';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/lib/money';
import { monthlyEquivalentCents } from '@/lib/recurring';

/** A one-row summary in Settings; the list and the forms live in their own sheet. */
export function RecurringSection() {
  const theme = useTheme();
  const { recurring, currency } = useExpenses();
  const [open, setOpen] = useState(false);

  const paused = recurring.filter((item) => item.paused).length;
  const headline =
    recurring.length === 0
      ? 'None yet'
      : `${recurring.length - paused} active${paused ? ` · ${paused} paused` : ''}`;

  return (
    <Section
      title="Recurring expenses"
      hint="Rent, subscriptions, a weekly allowance. They're logged automatically on the due day.">
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Opens the list of recurring expenses"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: theme.backgroundElement },
          pressed && styles.pressed,
        ]}>
        <View style={styles.text}>
          <ThemedText type="smallBold">{headline}</ThemedText>
          {recurring.length > 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              About {formatMoney(monthlyEquivalentCents(recurring), currency)} a month
            </ThemedText>
          )}
        </View>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {recurring.length === 0 ? 'Add' : 'Manage'} ›
        </ThemedText>
      </Pressable>
      <RecurringSheet visible={open} onClose={() => setOpen(false)} />
    </Section>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    minHeight: 56,
  },
  text: { flex: 1 },
  pressed: { opacity: 0.8 },
});
