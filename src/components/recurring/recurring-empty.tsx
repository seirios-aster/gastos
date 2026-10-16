import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { TemplateChips } from '@/components/recurring/template-chips';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RecurringTemplate } from '@/lib/recurring-templates';

const STEPS = [
  ['1', 'Add it once', 'Rent, Netflix, mobile load, a weekly allowance.'],
  ['2', 'Gastos logs it for you', "On the due day, even if you didn't open the app that day."],
  ['3', 'Get a nudge (optional)', 'A notification at 9:00 AM, on the day or the day before.'],
] as const;

/**
 * What the Recurring tab shows before anything is set up: what the feature does, one-tap starting
 * points, and a button.
 */
export function RecurringEmpty({ onAdd }: { onAdd: (template?: RecurringTemplate) => void }) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText style={styles.hero} accessibilityElementsHidden importantForAccessibility="no">
        🔁
      </ThemedText>
      <ThemedText type="heading" accessibilityRole="header" style={styles.title}>
        Bills that log themselves
      </ThemedText>

      <View style={styles.steps}>
        {STEPS.map(([number, title, text]) => (
          <View key={number} style={styles.step}>
            <View style={[styles.badge, { backgroundColor: theme.accent }]}>
              <ThemedText type="smallBold" themeColor="onAccent">
                {number}
              </ThemedText>
            </View>
            <View style={styles.stepText}>
              <ThemedText type="smallBold">{title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {text}
              </ThemedText>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.templates}>
        <ThemedText type="smallBold">Start from one of these</ThemedText>
        <TemplateChips onPick={onAdd} />
      </View>

      <Button label="New recurring expense" onPress={() => onAdd()} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.card, padding: Spacing.four, gap: Spacing.three },
  hero: { fontSize: 40, lineHeight: 48, textAlign: 'center' },
  title: { textAlign: 'center' },
  steps: { gap: Spacing.three },
  templates: { gap: Spacing.two },
  step: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { flex: 1 },
});
