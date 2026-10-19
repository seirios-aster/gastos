import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const STEPS = [
  ['1', 'Add a loan', 'Money you lent to someone, or borrowed from them.'],
  ['2', 'Record payments', 'Part by part, or all at once. The balance updates itself.'],
  ['3', 'Stay on top of it', 'Optional due date reminders, and a message you can send.'],
] as const;

/** What the Loans tab shows before there is a loan: what it is for, and a button. */
export function LoansEmpty({ onAdd }: { onAdd: () => void }) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText style={styles.hero} accessibilityElementsHidden importantForAccessibility="no">
        🤝
      </ThemedText>
      <ThemedText type="heading" accessibilityRole="header" style={styles.title}>
        Know who owes what
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.title}>
        Loans are kept apart from your spending, so your totals and budget stay right.
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
              <ThemedText type="defaultBold">{title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {text}
              </ThemedText>
            </View>
          </View>
        ))}
      </View>

      <Button label="Add a loan" onPress={onAdd} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.card, padding: Spacing.four, gap: Spacing.three },
  hero: { fontSize: 40, lineHeight: 52, textAlign: 'center' },
  title: { textAlign: 'center' },
  steps: { gap: Spacing.three },
  step: { flexDirection: 'row', gap: Spacing.mid, alignItems: 'flex-start' },
  badge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepText: { flex: 1, minWidth: 0 },
});
