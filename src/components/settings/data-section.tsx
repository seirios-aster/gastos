import { Alert, Pressable, Share, StyleSheet } from 'react-native';

import { Section } from '@/components/settings/section';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { useTheme } from '@/hooks/use-theme';
import { toCsv } from '@/lib/expenses';

export function DataSection() {
  const theme = useTheme();
  const { expenses, categories, clearAll } = useExpenses();

  async function exportCsv() {
    if (expenses.length === 0) {
      Alert.alert('Nothing to export', 'Add an expense first.');
      return;
    }
    try {
      await Share.share({ title: 'gastos-expenses.csv', message: toCsv(expenses, categories) });
    } catch {
      // the user dismissed the share sheet or sharing is unavailable
    }
  }

  function confirmErase() {
    Alert.alert(
      'Erase all expenses?',
      `This permanently deletes all ${expenses.length} expenses from this phone. Your categories, recurring expenses and settings are kept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Erase expenses', style: 'destructive', onPress: () => void clearAll() },
      ]
    );
  }

  return (
    <Section
      title="Your data"
      hint="Everything is stored on this phone only. Export a CSV to back it up or open it in a spreadsheet.">
      <Pressable
        accessibilityRole="button"
        onPress={exportCsv}
        style={[styles.action, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="smallBold">Export as CSV</ThemedText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={confirmErase}
        style={[styles.action, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="smallBold" themeColor="danger">
          Erase all expenses
        </ThemedText>
      </Pressable>
    </Section>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    borderRadius: Spacing.three - 4,
    paddingVertical: Spacing.three - 2,
  },
});
