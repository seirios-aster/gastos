import { useRef, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { FocusInput } from '@/components/focus-input';
import { ActionSheet } from '@/components/action-sheet';
import { Button } from '@/components/button';
import { FieldError } from '@/components/field-error';
import { confirm, info } from '@/components/notices';
import { Section } from '@/components/settings/section';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { useInputStyle } from '@/hooks/use-input-style';
import { useSheetNotice } from '@/hooks/use-sheet-notice';
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
  // Results and confirmations use the app's own sheet. A second one, because the CSV choice below is its own.
  const { notify, sheetProps: noticeProps } = useSheetNotice();

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
      notify(info('Could not share', 'The CSV could not be shared. Please try again.'));
    }
  }

  async function saveCsvToPhone() {
    try {
      const saved = await saveTextFileToFolder(
        `gastos-expenses-${dayKey(Date.now())}.csv`,
        toCsvFile(expenses, categories),
        'text/csv'
      );
      if (saved) notify(info('Saved', 'The CSV file is in the folder you picked.'));
    } catch (error) {
      console.warn('Could not save the CSV', error);
      notify(info('Could not save', 'The file could not be saved to that folder. Try another folder.'));
    }
  }

  /** One CSV button: ask whether to share the file or keep a copy on the phone. */
  function exportCsv() {
    if (expenses.length === 0) {
      notify(info('Nothing to export', 'Add an expense first.'));
      return;
    }
    setChoosingCsv(true);
  }

  async function shareBackup() {
    try {
      await Share.share({ title: 'gastos-backup.json', message: exportBackup() });
    } catch (error) {
      console.warn('Could not share the backup', error);
      notify(
        info(
          'Could not share the backup',
          'It may be too large to share as text. Try again, or export a CSV instead.'
        )
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
    notify(
      confirm({
        title: 'Restore this backup?',
        message: `Expenses: ${found.length}\nCategories: ${foundCategories.length}\nRecurring: ${recurring.length}\n\nRestoring only adds what is missing on this phone. Nothing you already have is deleted or changed.`,
        confirmLabel: 'Restore',
        onConfirm: () => void restore(),
      })
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
      notify(
        info(
          'Backup restored',
          `Added ${result.expenses} expenses, ${result.categories} categories and ${result.recurring} recurring expenses. Anything already on this phone was left as it was.`
        )
      );
    } catch (failure) {
      console.warn('Could not restore backup', failure);
      setError('Could not restore the backup. Please try again.');
    } finally {
      importing.current = false;
    }
  }

  function confirmErase() {
    notify(
      confirm({
        title: 'Erase all expenses?',
        message: `This permanently deletes all ${expenses.length} expenses from this phone. Your categories, recurring expenses and settings are kept.`,
        confirmLabel: 'Erase expenses',
        cancelLabel: 'Keep them',
        destructive: true,
        onConfirm: () => void clearAll(),
      })
    );
  }

  return (
    <>
      <Section
        title="Backup"
        hint="Your data lives only on this phone. A backup is a full copy to keep safe.">
        <Button variant="secondary" label="Export backup" onPress={shareBackup} />
        <Button
          variant="secondary"
          label="Restore from backup"
          expanded={restoring}
          onPress={() => setRestoring((open) => !open)}
        />
        {restoring && (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              Paste the text of a backup made with “Export backup”. Restoring only adds what is
              missing on this phone; it never deletes or changes what you already have.
            </ThemedText>
            <FocusInput
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
            <Button label="Restore" onPress={confirmRestore} />
          </>
        )}
      </Section>

      <Section
        title="Spreadsheet (CSV)"
        hint="A .csv file for Excel or Google Sheets. To restore, use a backup instead.">
        <Button variant="secondary" label="Export CSV" onPress={exportCsv} />
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
            label: 'Share',
            description: 'Email, Drive, chat and other apps',
            onPress: () => void shareCsv(),
          },
        ]}
        onClose={() => setChoosingCsv(false)}
      />

      <ActionSheet {...noticeProps} />

      {/* Set apart from the harmless actions above. */}
      <View style={styles.danger}>
        <Section
          title="Erase"
          hint="Deletes every expense on this phone. Categories, recurring expenses and settings are kept.">
          <Button variant="danger" label="Erase all expenses" onPress={confirmErase} />
        </Section>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  danger: { marginTop: Spacing.three },
  backupInput: { minHeight: 120, maxHeight: 240, textAlignVertical: 'top' },
});
