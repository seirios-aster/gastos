import { useRef, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, TextInput } from 'react-native';

import { ActionSheet } from '@/components/action-sheet';
import { FieldError } from '@/components/field-error';
import { Section } from '@/components/settings/section';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { useInputStyle } from '@/hooks/use-input-style';
import { useTheme } from '@/hooks/use-theme';
import { dayKey } from '@/lib/dates';
import { parseBackup, toCsv, toCsvFile } from '@/lib/expenses';
import { saveTextFileToFolder, shareTextFile } from '@/lib/share-file';

export function DataSection() {
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const { expenses, categories, clearAll, exportBackup, importBackup } = useExpenses();
  const [restoring, setRestoring] = useState(false);
  const [choosingCsv, setChoosingCsv] = useState(false);
  const [backupText, setBackupText] = useState('');
  const [error, setError] = useState('');
  const importing = useRef(false);

  async function shareCsv() {
    try {
      const sharedAsFile = await shareTextFile(
        'gastos-expenses.csv',
        toCsvFile(expenses, categories),
        {
          mimeType: 'text/csv',
          uti: 'public.comma-separated-values-text',
          dialogTitle: 'Export Gastos expenses',
        }
      );
      // No file sharing on this device: send the same data as plain text instead.
      if (!sharedAsFile) {
        await Share.share({ title: 'gastos-expenses.csv', message: toCsv(expenses, categories) });
      }
    } catch (error) {
      // Dismissing the share sheet is not an error, so reaching here is a real failure.
      console.warn('Could not share the CSV', error);
      Alert.alert('Could not share', 'The CSV could not be shared. Please try again.');
    }
  }

  async function saveCsvToPhone() {
    try {
      const saved = await saveTextFileToFolder(
        `gastos-expenses-${dayKey(Date.now())}.csv`,
        toCsvFile(expenses, categories),
        'text/csv'
      );
      if (saved) Alert.alert('Saved', 'The CSV file is in the folder you picked.');
    } catch (error) {
      console.warn('Could not save the CSV', error);
      Alert.alert('Could not save', 'The file could not be saved to that folder. Try another folder.');
    }
  }

  /** One CSV button: ask whether to share the file or keep a copy on the phone. */
  function exportCsv() {
    if (expenses.length === 0) {
      Alert.alert('Nothing to export', 'Add an expense first.');
      return;
    }
    setChoosingCsv(true);
  }

  async function shareBackup() {
    try {
      await Share.share({ title: 'gastos-backup.json', message: exportBackup() });
    } catch (error) {
      console.warn('Could not share the backup', error);
      Alert.alert(
        'Could not share the backup',
        'It may be too large to share as text. Try again, or export a CSV instead.'
      );
    }
  }

  function confirmRestore() {
    const parsed = parseBackup(backupText);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const { expenses: found, categories: foundCategories, recurring } = parsed.backup;
    Alert.alert(
      'Restore this backup?',
      `Expenses: ${found.length}\nCategories: ${foundCategories.length}\nRecurring: ${recurring.length}\n\nRestoring only adds what is missing on this phone. Nothing you already have is deleted or changed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', onPress: () => void restore() },
      ]
    );
  }

  async function restore() {
    if (importing.current) return;
    importing.current = true;
    try {
      const result = await importBackup(backupText);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBackupText('');
      setError('');
      setRestoring(false);
      Alert.alert(
        'Backup restored',
        `Added ${result.expenses} expenses, ${result.categories} categories and ${result.recurring} recurring expenses. Anything already on this phone was left as it was.`
      );
    } catch (failure) {
      console.warn('Could not restore backup', failure);
      setError('Could not restore the backup. Please try again.');
    } finally {
      importing.current = false;
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
    <>
      <Section
        title="Backup"
        hint="Everything is stored on this phone only. A backup is a full copy (expenses, categories and recurring expenses) to keep safe or move to a new phone.">
        <Pressable
          accessibilityRole="button"
          onPress={shareBackup}
          style={[styles.action, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold">Export backup</ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: restoring }}
          onPress={() => setRestoring((open) => !open)}
          style={[styles.action, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold">Restore from backup</ThemedText>
        </Pressable>
        {restoring && (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              Paste the text of a backup made with “Export backup”. Restoring only adds what is
              missing on this phone; it never deletes or changes what you already have.
            </ThemedText>
            <TextInput
              style={[inputStyle, styles.backupInput]}
              value={backupText}
              onChangeText={(text) => {
                setBackupText(text);
                setError('');
              }}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Paste backup here"
              placeholderTextColor={theme.textSecondary}
              accessibilityLabel="Backup text"
            />
            {error ? <FieldError>{error}</FieldError> : null}
            <Pressable
              accessibilityRole="button"
              onPress={confirmRestore}
              style={[styles.action, { backgroundColor: theme.accent }]}>
              <ThemedText type="smallBold" themeColor="onAccent">
                Restore
              </ThemedText>
            </Pressable>
          </>
        )}
      </Section>

      <Section
        title="Spreadsheet (CSV)"
        hint="Your expenses as a .csv file for Excel or Google Sheets. Gastos can't restore from a CSV, so use a backup for that.">
        <Pressable
          accessibilityRole="button"
          onPress={exportCsv}
          style={[styles.action, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold">Export CSV…</ThemedText>
        </Pressable>
      </Section>

      <ActionSheet
        visible={choosingCsv}
        title="Export CSV"
        message="How do you want to export your expenses?"
        actions={[
          {
            label: 'Save to phone',
            description: 'Pick a folder, like Downloads',
            onPress: () => void saveCsvToPhone(),
          },
          {
            label: 'Share…',
            description: 'Email, Drive, chat and other apps',
            onPress: () => void shareCsv(),
          },
        ]}
        onClose={() => setChoosingCsv(false)}
      />

      <Section
        title="Erase"
        hint="Deletes every expense on this phone. Your categories, recurring expenses and settings are kept.">
        <Pressable
          accessibilityRole="button"
          onPress={confirmErase}
          style={[styles.action, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold" themeColor="danger">
            Erase all expenses
          </ThemedText>
        </Pressable>
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    borderRadius: Spacing.three - 4,
    paddingVertical: Spacing.three - 2,
  },
  backupInput: { minHeight: 120, maxHeight: 240, textAlignVertical: 'top' },
});
