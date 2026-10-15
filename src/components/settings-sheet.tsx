import { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { useTheme } from '@/hooks/use-theme';
import { toCsv } from '@/lib/expenses';

const PRESETS = ['', '$', '€', '£', '¥', '₱', '₹', '₩', 'R$'];

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function SettingsSheet({ visible, onClose }: Props) {
  const theme = useTheme();
  const { expenses, currency, setCurrency, clearAll } = useExpenses();
  const [custom, setCustom] = useState('');

  const isPreset = PRESETS.includes(currency);

  async function exportCsv() {
    if (expenses.length === 0) {
      Alert.alert('Nothing to export', 'Add an expense first.');
      return;
    }
    try {
      await Share.share({ title: 'gastos-expenses.csv', message: toCsv(expenses) });
    } catch {
      // the user dismissed the share sheet or sharing is unavailable
    }
  }

  function confirmErase() {
    Alert.alert(
      'Erase all data?',
      `This permanently deletes all ${expenses.length} expenses from this phone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Erase everything', style: 'destructive', onPress: () => void clearAll() },
      ]
    );
  }

  return (
    <Sheet visible={visible} title="Settings" onClose={onClose}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <ThemedText type="smallBold">Currency symbol</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Shown before amounts. Choose “None” to show plain numbers.
          </ThemedText>
          <View style={styles.chips}>
            {PRESETS.map((symbol) => {
              const selected = symbol === currency;
              return (
                <Pressable
                  key={symbol || 'none'}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setCurrency(symbol);
                    setCustom('');
                  }}
                  style={[
                    styles.chip,
                    { backgroundColor: selected ? theme.accent : theme.backgroundElement },
                  ]}>
                  <ThemedText type="smallBold" themeColor={selected ? 'onAccent' : 'text'}>
                    {symbol || 'None'}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            style={[
              styles.input,
              { color: theme.text, backgroundColor: theme.backgroundElement },
            ]}
            value={isPreset ? custom : currency}
            onChangeText={(text) => {
              setCustom(text);
              setCurrency(text.trim());
            }}
            maxLength={4}
            placeholder="Or type your own (e.g. Fr)"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="smallBold">Your data</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Everything is stored on this phone only. Export a CSV to back it up or open it in a
            spreadsheet.
          </ThemedText>
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
              Erase all data
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
    gap: Spacing.four,
  },
  section: { gap: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, paddingVertical: Spacing.one },
  chip: {
    minWidth: 52,
    alignItems: 'center',
    paddingHorizontal: Spacing.three - 2,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  input: {
    borderRadius: Spacing.three - 4,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three - 4,
    fontSize: 16,
  },
  action: {
    alignItems: 'center',
    borderRadius: Spacing.three - 4,
    paddingVertical: Spacing.three - 2,
  },
});
