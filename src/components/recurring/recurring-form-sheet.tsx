import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ActionSheet, type SheetNotice } from '@/components/action-sheet';
import { Button } from '@/components/button';
import { CategoryChips } from '@/components/category-chips';
import { TemplateChips } from '@/components/recurring/template-chips';
import { FieldError } from '@/components/field-error';
import {
  confirmStop,
  notificationsOff,
  somethingWentWrong,
} from '@/components/recurring/notices';
import { Segmented } from '@/components/segmented';
import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Touch } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { useInputStyle } from '@/hooks/use-input-style';
import { useSheetNotice } from '@/hooks/use-sheet-notice';
import { useTheme } from '@/hooks/use-theme';
import { isSameDay } from '@/lib/dates';
import { getCategory, MAX_NOTE_LENGTH } from '@/lib/expenses';
import { success, tick } from '@/lib/haptics';
import { centsToInput, parseAmountToCents } from '@/lib/money';
import {
  nextOccurrence,
  REMINDER_CHOICES,
  WEEKDAYS,
  type Frequency,
  type Recurring,
} from '@/lib/recurring';
import { draftFromTemplate, type RecurringTemplate } from '@/lib/recurring-templates';
import { ensureReminderPermission } from '@/lib/reminders';

/** What the sheet is doing: adding a new item (maybe from a template), or editing one. */
export type Editor = { mode: 'new'; template?: RecurringTemplate } | { mode: 'edit'; item: Recurring };

type Props = {
  /** Null while the sheet is closed. */
  editor: Editor | null;
  onClose: () => void;
  /** After a new item is saved. `dueToday` means it was already logged as one of today's expenses. */
  onAdded?: (info: { label: string; dueToday: boolean }) => void;
};

/**
 * The add/edit form in a full-height sheet. Its own messages (permission, errors, "Stop?") use an
 * ActionSheet rendered inside this sheet: a second modal can't open over one that is already open.
 */
export function RecurringFormSheet({ editor, onClose, onAdded }: Props) {
  const { notify, sheetProps } = useSheetNotice();

  return (
    <Sheet
      visible={editor !== null}
      title={editor?.mode === 'edit' ? 'Edit recurring' : 'New recurring'}
      onClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          {/* Keyed, so the form starts from the item's values every time the sheet opens. */}
          {editor && (
            <RecurringForm
              key={editor.mode === 'edit' ? `edit-${editor.item.id}` : `new-${editor.template?.id ?? ''}`}
              item={editor.mode === 'edit' ? editor.item : undefined}
              template={editor.mode === 'new' ? editor.template : undefined}
              notify={notify}
              onDone={onClose}
              onAdded={onAdded}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <ActionSheet {...sheetProps} />
    </Sheet>
  );
}

type FormProps = {
  /** The item being edited; leave out to add a new one. */
  item?: Recurring;
  /** A starting point for a new item (Rent, Netflix...); ignored when editing. */
  template?: RecurringTemplate;
  notify: (notice: SheetNotice) => void;
  onDone: () => void;
  onAdded?: Props['onAdded'];
};

function RecurringForm({ item, template, notify, onDone, onAdded }: FormProps) {
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const { categories, currency, addRecurring, updateRecurring, setRecurringPaused, deleteRecurring } =
    useExpenses();

  // A template only fills in the starting values; the amount is always left for the person.
  const [start] = useState(() =>
    template && !item
      ? draftFromTemplate(template, categories.map((c) => c.id), Date.now())
      : null
  );
  const [amount, setAmount] = useState(item ? centsToInput(item.amountCents) : '');
  const [title, setTitle] = useState(item?.title ?? start?.title ?? '');
  const [category, setCategory] = useState(item?.category ?? start?.category ?? 'bills');
  const [frequency, setFrequency] = useState<Frequency>(
    item?.frequency ?? start?.frequency ?? 'monthly'
  );
  const [weekday, setWeekday] = useState(() =>
    item?.frequency === 'weekly'
      ? item.day
      : start?.frequency === 'weekly'
        ? start.day
        : new Date().getDay()
  );
  const [monthDay, setMonthDay] = useState(() =>
    String(
      item?.frequency === 'monthly'
        ? item.day
        : start?.frequency === 'monthly'
          ? start.day
          : new Date().getDate()
    )
  );
  // 'off', or how many days before the due day to remind ('0' = on the day).
  const [remind, setRemind] = useState(item?.remindDays == null ? 'off' : String(item.remindDays));
  const [error, setError] = useState('');
  const saving = useRef(false);

  /** The quick-start row: fill in the note, category and schedule, keep whatever amount was typed. */
  function applyTemplate(picked: RecurringTemplate) {
    const draft = draftFromTemplate(picked, categories.map((c) => c.id), Date.now());
    setTitle(draft.title);
    setCategory(draft.category);
    setFrequency(draft.frequency);
    if (draft.frequency === 'weekly') setWeekday(draft.day);
    else setMonthDay(String(draft.day));
    setError('');
  }

  async function chooseReminder(value: string) {
    // Ask for permission when it is first needed, not when the app opens.
    if (value !== 'off' && !(await ensureReminderPermission())) {
      notify(notificationsOff());
      setRemind('off');
      return;
    }
    setRemind(value);
  }

  async function save() {
    if (saving.current) return;
    const amountCents = parseAmountToCents(amount);
    if (amountCents === null) {
      setError('Enter an amount greater than 0');
      return;
    }
    const dayOfMonth = parseInt(monthDay, 10);
    if (frequency === 'monthly' && !(dayOfMonth >= 1 && dayOfMonth <= 31)) {
      setError('Pick a day of the month from 1 to 31');
      return;
    }
    saving.current = true;
    try {
      const day = frequency === 'weekly' ? weekday : dayOfMonth;
      const input = {
        title: title.trim(),
        amountCents,
        category,
        frequency,
        day,
        remindDays: remind === 'off' ? null : Number(remind),
      };
      if (item) {
        await updateRecurring(item.id, input);
      } else {
        const now = Date.now();
        await addRecurring(input);
        onAdded?.({
          label: input.title || getCategory(categories, category).label,
          dueToday: isSameDay(nextOccurrence(frequency, day, now), now),
        });
      }
      success();
      onDone();
    } catch (failure) {
      console.warn('Could not save recurring expense', failure);
      notify(somethingWentWrong('Could not save'));
    } finally {
      saving.current = false;
    }
  }

  async function togglePause(current: Recurring) {
    if (saving.current) return;
    saving.current = true;
    try {
      await setRecurringPaused(current.id, !current.paused);
      onDone();
    } catch (failure) {
      console.warn('Could not change the recurring expense', failure);
      notify(somethingWentWrong('Could not update'));
    } finally {
      saving.current = false;
    }
  }

  function askStop(current: Recurring) {
    const label = current.title || getCategory(categories, current.category).label;
    notify(
      confirmStop(label, () => {
        deleteRecurring(current.id).then(onDone, (failure) => {
          console.warn('Could not stop the recurring expense', failure);
          notify(somethingWentWrong('Could not stop'));
        });
      })
    );
  }

  return (
    <View style={styles.form}>
      {!item && (
        <>
          <ThemedText type="smallBold">Quick start</ThemedText>
          <TemplateChips
            layout="row"
            surface="screen"
            bleed={Spacing.four}
            onPick={applyTemplate}
          />
        </>
      )}
      <TextInput
        style={inputStyle}
        value={amount}
        onChangeText={(text) => {
          setAmount(text);
          setError('');
        }}
        keyboardType="decimal-pad"
        placeholder={currency ? `Amount (${currency})` : 'Amount'}
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel="Recurring amount"
      />
      <TextInput
        style={inputStyle}
        value={title}
        onChangeText={setTitle}
        placeholder="Note (e.g. Rent)"
        maxLength={MAX_NOTE_LENGTH}
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel="Note"
      />
      <CategoryChips value={category} onChange={setCategory} bleed={Spacing.four} />
      <Segmented
        accessibilityLabel="How often"
        options={[
          { value: 'monthly', label: 'Monthly' },
          { value: 'weekly', label: 'Weekly' },
        ]}
        value={frequency}
        onChange={setFrequency}
      />
      {frequency === 'weekly' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.days}>
            {WEEKDAYS.map((name, index) => {
              const selected = index === weekday;
              return (
                <Pressable
                  key={name}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    if (!selected) tick();
                    setWeekday(index);
                  }}
                  style={({ pressed }) => [
                    styles.day,
                    { backgroundColor: selected ? theme.accent : theme.backgroundSelected },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="smallBold" themeColor={selected ? 'onAccent' : 'text'}>
                    {name}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.monthDayRow}>
          <ThemedText type="small">Day of the month</ThemedText>
          <TextInput
            style={[inputStyle, styles.monthDayInput]}
            value={monthDay}
            onChangeText={(text) => {
              setMonthDay(text.replace(/[^0-9]/g, '').slice(0, 2));
              setError('');
            }}
            keyboardType="number-pad"
            maxLength={2}
            accessibilityLabel="Day of the month"
          />
        </View>
      )}
      {frequency === 'monthly' && (
        <ThemedText type="small" themeColor="textSecondary">
          On shorter months it lands on the last day (e.g. the 31st becomes the 30th).
        </ThemedText>
      )}
      <ThemedText type="smallBold">Remind me</ThemedText>
      <Segmented
        accessibilityLabel="Remind me"
        options={REMINDER_CHOICES.map((choice) => ({
          value: String(choice.days ?? 'off'),
          label: choice.label,
        }))}
        value={remind}
        onChange={chooseReminder}
      />
      {remind !== 'off' && (
        <ThemedText type="small" themeColor="textSecondary">
          You&apos;ll get a notification at 9:00 AM{remind === '0' ? ' on the due day' : ' the day before'}.
          Gastos still logs the expense by itself when you open the app.
        </ThemedText>
      )}
      {error ? <FieldError>{error}</FieldError> : null}
      <Button
        label={item ? 'Save changes' : 'Add recurring expense'}
        onPress={save}
        style={styles.primary}
      />
      {item && (
        <>
          <Button
            variant="secondary"
            label={item.paused ? 'Resume' : 'Pause'}
            onPress={() => void togglePause(item)}
          />
          {item.paused && (
            <ThemedText type="small" themeColor="textSecondary">
              Paused: nothing is logged until you resume. Resuming doesn&apos;t add the days you missed.
            </ThemedText>
          )}
          <Button variant="danger" label="Stop repeating" onPress={() => askStop(item)} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six },
  form: { gap: Spacing.mid },
  days: { flexDirection: 'row', gap: Spacing.two },
  day: {
    minWidth: Touch.button,
    minHeight: Touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
  },
  pressed: { opacity: 0.8 },
  monthDayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthDayInput: { width: 72, textAlign: 'center' },
  primary: { marginTop: Spacing.two },
});
