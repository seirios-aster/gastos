import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { FocusInput } from '@/components/focus-input';
import { ActionSheet, type SheetNotice } from '@/components/action-sheet';
import { Button } from '@/components/button';
import { FieldError } from '@/components/field-error';
import { DateStepper } from '@/components/loans/date-stepper';
import { confirmDeleteLoan } from '@/components/notices';
import { notificationsOff, somethingWentWrong } from '@/components/recurring/notices';
import { Segmented } from '@/components/segmented';
import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Touch } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { useInputStyle } from '@/hooks/use-input-style';
import { useNow } from '@/hooks/use-now';
import { useSheetNotice } from '@/hooks/use-sheet-notice';
import { useGlass } from '@/hooks/use-glass';
import { useTheme } from '@/hooks/use-theme';
import { addDays, startOfDay } from '@/lib/dates';
import { MAX_NOTE_LENGTH } from '@/lib/expenses';
import { success, tick } from '@/lib/haptics';
import {
  MAX_PERSON_LENGTH,
  cleanPerson,
  paidCents,
  recentPeople,
  type Direction,
  type Loan,
} from '@/lib/loans';
import { centsToInput, formatMoney, parseAmountToCents } from '@/lib/money';
import { ensureReminderPermission } from '@/lib/reminders';

/** What the sheet is doing: adding a loan (maybe for a known person), or editing one. */
export type LoanEditor = { mode: 'new'; person?: string } | { mode: 'edit'; loan: Loan };

type Props = {
  /** Null while the sheet is closed. */
  editor: LoanEditor | null;
  onClose: () => void;
};

/** The add/edit form in a full-height sheet. Its messages use an ActionSheet inside this sheet. */
export function LoanFormSheet({ editor, onClose }: Props) {
  const { notify, sheetProps } = useSheetNotice();

  return (
    <Sheet
      visible={editor !== null}
      title={editor?.mode === 'edit' ? 'Edit loan' : 'New loan'}
      onClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          {editor && (
            <LoanForm
              key={editor.mode === 'edit' ? `edit-${editor.loan.id}` : `new-${editor.person ?? ''}`}
              loan={editor.mode === 'edit' ? editor.loan : undefined}
              person={editor.mode === 'new' ? editor.person : undefined}
              notify={notify}
              onDone={onClose}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <ActionSheet {...sheetProps} />
    </Sheet>
  );
}

type FormProps = {
  loan?: Loan;
  person?: string;
  notify: (notice: SheetNotice) => void;
  onDone: () => void;
};

/** Quick due dates, counted from today. */
const DUE_SHORTCUTS = [
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
] as const;

function LoanForm({ loan, person: startPerson, notify, onDone }: FormProps) {
  const theme = useTheme();
  const glass = useGlass();
  const inputStyle = useInputStyle();
  const now = useNow();
  const { loans, currency, addLoan, updateLoan, deleteLoan } = useExpenses();

  const [direction, setDirection] = useState<Direction>(loan?.direction ?? 'lent');
  const [person, setPerson] = useState(loan?.person ?? startPerson ?? '');
  const [amount, setAmount] = useState(loan ? centsToInput(loan.amountCents) : '');
  const [note, setNote] = useState(loan?.note ?? '');
  const [createdAt, setCreatedAt] = useState(() => loan?.createdAt ?? Date.now());
  const [dueAt, setDueAt] = useState<number | null>(loan?.dueAt ?? null);
  const [remind, setRemind] = useState(loan?.remind ?? false);
  const [error, setError] = useState('');
  const saving = useRef(false);

  const people = recentPeople(loans);
  const today = startOfDay(now);

  async function chooseRemind(on: boolean) {
    // Ask for permission when it is first needed, not when the app opens.
    if (on && !(await ensureReminderPermission())) {
      notify(notificationsOff());
      setRemind(false);
      return;
    }
    setRemind(on);
  }

  async function save() {
    if (saving.current) return;
    const name = cleanPerson(person);
    if (!name) {
      setError('Enter who it is with');
      return;
    }
    const amountCents = parseAmountToCents(amount);
    if (amountCents === null) {
      setError('Enter an amount greater than 0');
      return;
    }
    if (loan && amountCents < paidCents(loan)) {
      setError(`${formatMoney(paidCents(loan), currency)} is already paid back, so the amount can't be lower`);
      return;
    }
    saving.current = true;
    try {
      const input = {
        person: name,
        direction,
        amountCents,
        note: note.trim(),
        createdAt,
        dueAt,
        remind: dueAt !== null && remind,
      };
      if (loan) await updateLoan(loan.id, input);
      else await addLoan(input);
      success();
      onDone();
    } catch (failure) {
      console.warn('Could not save the loan', failure);
      notify(somethingWentWrong('Could not save'));
    } finally {
      saving.current = false;
    }
  }

  function askDelete(current: Loan) {
    notify(
      confirmDeleteLoan(current.person, () => {
        deleteLoan(current.id).then(onDone, (failure) => {
          console.warn('Could not delete the loan', failure);
          notify(somethingWentWrong('Could not delete'));
        });
      })
    );
  }

  return (
    <View style={styles.form}>
      <Segmented
        accessibilityLabel="Lent or borrowed"
        options={[
          { value: 'lent', label: 'I lent' },
          { value: 'borrowed', label: 'I borrowed' },
        ]}
        value={direction}
        onChange={setDirection}
      />
      <ThemedText type="small" themeColor="textSecondary">
        {direction === 'lent' ? 'They owe you this money.' : 'You owe them this money.'}
      </ThemedText>

      <FocusInput
        style={inputStyle}
        value={person}
        onChangeText={(text) => {
          setPerson(text);
          setError('');
        }}
        placeholder={direction === 'lent' ? 'Lent to (name)' : 'Borrowed from (name)'}
        maxLength={MAX_PERSON_LENGTH}
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel="Person"
      />
      {people.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.chips}>
            {people.map((name) => (
              <Pressable
                key={name}
                accessibilityRole="button"
                accessibilityLabel={`Use ${name}`}
                onPress={() => {
                  tick();
                  setPerson(name);
                  setError('');
                }}
                style={({ pressed }) => [
                  styles.chip,
                  { backgroundColor: theme.backgroundSelected },
                glass.chip,
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold">{name}</ThemedText>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

      <FocusInput
        style={inputStyle}
        value={amount}
        onChangeText={(text) => {
          setAmount(text);
          setError('');
        }}
        keyboardType="decimal-pad"
        placeholder={currency ? `Amount (${currency})` : 'Amount'}
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel="Loan amount"
      />
      <FocusInput
        style={inputStyle}
        value={note}
        onChangeText={setNote}
        placeholder="Note (optional)"
        maxLength={MAX_NOTE_LENGTH}
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel="Note"
      />

      <ThemedText type="smallBold">{direction === 'lent' ? 'Lent on' : 'Borrowed on'}</ThemedText>
      <DateStepper
        value={createdAt}
        onChange={setCreatedAt}
        label={direction === 'lent' ? 'Date lent' : 'Date borrowed'}
        now={now}
        max={now}
      />

      <ThemedText type="smallBold">Pay back by (optional)</ThemedText>
      {dueAt === null ? (
        <View style={styles.chips}>
          {DUE_SHORTCUTS.map((shortcut) => (
            <Pressable
              key={shortcut.label}
              accessibilityRole="button"
              accessibilityLabel={`Due in ${shortcut.label}`}
              onPress={() => {
                tick();
                setDueAt(addDays(today, shortcut.days));
              }}
              style={({ pressed }) => [
                styles.chip,
                { backgroundColor: theme.backgroundSelected },
                glass.chip,
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">In {shortcut.label}</ThemedText>
            </Pressable>
          ))}
        </View>
      ) : (
        <>
          <DateStepper value={dueAt} onChange={setDueAt} label="Due date" now={now} min={createdAt} />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setDueAt(null);
              setRemind(false);
            }}
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
            <ThemedText type="linkPrimary">No deadline</ThemedText>
          </Pressable>
          <ThemedText type="smallBold">Remind me</ThemedText>
          <Segmented
            accessibilityLabel="Remind me on the due day"
            options={[
              { value: 'off', label: 'No' },
              { value: 'on', label: 'On the day' },
            ]}
            value={remind ? 'on' : 'off'}
            onChange={(value) => void chooseRemind(value === 'on')}
          />
          {remind && (
            <ThemedText type="small" themeColor="textSecondary">
              You&apos;ll get a notification at 9:00 AM on the due day.
            </ThemedText>
          )}
        </>
      )}

      {error ? <FieldError>{error}</FieldError> : null}
      <Button label={loan ? 'Save changes' : 'Add loan'} onPress={save} style={styles.primary} />
      {loan && <Button variant="danger" label="Delete loan" onPress={() => askDelete(loan)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six },
  form: { gap: Spacing.mid },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    minHeight: Touch.min,
    justifyContent: 'center',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
  },
  link: { minHeight: Touch.min, justifyContent: 'center' },
  pressed: { opacity: 0.8 },
  primary: { marginTop: Spacing.two },
});
