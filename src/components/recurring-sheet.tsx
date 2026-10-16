import { useMemo, useRef, useState } from 'react';
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
import { CategoryChips } from '@/components/category-chips';
import { FieldError } from '@/components/field-error';
import { Segmented } from '@/components/segmented';
import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { useInputStyle } from '@/hooks/use-input-style';
import { useTheme } from '@/hooks/use-theme';
import { shortDateLabel } from '@/lib/dates';
import { getCategory, MAX_NOTE_LENGTH } from '@/lib/expenses';
import { centsToInput, formatMoney, parseAmountToCents } from '@/lib/money';
import {
  describeSchedule,
  monthlyEquivalentCents,
  REMINDER_CHOICES,
  WEEKDAYS,
  type Frequency,
  type Recurring,
} from '@/lib/recurring';
import { ensureReminderPermission, openNotificationSettings, sendTestReminder } from '@/lib/reminders';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const NOTIFICATIONS_OFF: SheetNotice = {
  title: 'Notifications are off',
  message:
    "Allow notifications for Gastos in your phone's settings to get reminders. Tap Open Settings, then Notifications.",
  actions: [{ label: 'Open Settings', onPress: openNotificationSettings }],
  cancelLabel: 'Not now',
};

const SOMETHING_WENT_WRONG = (title: string): SheetNotice => ({
  title,
  message: 'Something went wrong. Please try again.',
  cancelLabel: 'OK',
});

/** Everything about recurring expenses on one screen, so Settings stays short however many there are. */
export function RecurringSheet({ visible, onClose }: Props) {
  const theme = useTheme();
  const { recurring, categories, currency } = useExpenses();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  // Messages use the app's own sheet, not the system pop-up, which ignores dark mode.
  // The content is kept after closing so it doesn't go blank while the sheet fades out.
  const [notice, setNotice] = useState<SheetNotice | null>(null);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const notify = (next: SheetNotice) => {
    setNotice(next);
    setNoticeOpen(true);
  };

  // Active items first, soonest due at the top; paused ones sink to the bottom.
  const sorted = useMemo(
    () => [...recurring].sort((a, b) => Number(a.paused) - Number(b.paused) || a.nextDue - b.nextDue),
    [recurring]
  );
  const paused = recurring.filter((item) => item.paused).length;
  const perMonth = monthlyEquivalentCents(recurring);

  return (
    <Sheet visible={visible} title="Recurring expenses" onClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <ThemedText type="small" themeColor="textSecondary">
            Rent, subscriptions, a weekly allowance. They&apos;re logged automatically on the due day,
            even if you didn&apos;t open the app that day. Tap one to change it.
          </ThemedText>

          {recurring.length > 0 && (
            <View>
              <ThemedText type="smallBold">
                {recurring.length - paused} active{paused ? ` · ${paused} paused` : ''}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                About {formatMoney(perMonth, currency)} a month
              </ThemedText>
            </View>
          )}

          {adding ? (
            <RecurringForm notify={notify} onDone={() => setAdding(false)} />
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setEditingId(null);
                setAdding(true);
              }}
              style={[styles.addButton, { backgroundColor: theme.accent }]}>
              <ThemedText type="smallBold" themeColor="onAccent">
                New recurring expense
              </ThemedText>
            </Pressable>
          )}

          {recurring.length === 0 && !adding && (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              Nothing recurring yet.
            </ThemedText>
          )}

          {sorted.map((item) => {
            // The form opens in the row's place so the edit is where the person tapped.
            if (item.id === editingId) {
              return (
                <RecurringForm
                  key={item.id}
                  item={item}
                  notify={notify}
                  onDone={() => setEditingId(null)}
                />
              );
            }
            const cat = getCategory(categories, item.category);
            const label = item.title || cat.label;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`${label}, ${formatMoney(item.amountCents, currency)}, ${describeSchedule(item)}, ${item.paused ? 'paused' : `next ${shortDateLabel(item.nextDue)}`}`}
                accessibilityHint="Opens the editor"
                onPress={() => {
                  setAdding(false);
                  setEditingId(item.id);
                }}
                style={[
                  styles.item,
                  { backgroundColor: theme.backgroundElement },
                  item.paused && styles.paused,
                ]}>
                <ThemedText style={styles.itemEmoji}>{cat.emoji}</ThemedText>
                <View style={styles.itemText}>
                  <ThemedText numberOfLines={1}>{label}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.paused
                      ? `Paused · ${describeSchedule(item)}`
                      : `${describeSchedule(item)} · next ${shortDateLabel(item.nextDue)}${item.remindDays === null ? '' : ' · 🔔'}`}
                  </ThemedText>
                </View>
                <ThemedText type="smallBold">{formatMoney(item.amountCents, currency)}</ThemedText>
              </Pressable>
            );
          })}

          {recurring.some((item) => !item.paused && item.remindDays !== null) && (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={async () => {
                if (await sendTestReminder()) {
                  notify({
                    title: 'Test sent',
                    message:
                      'A notification will appear in a few seconds. Leave the app or pull down your notification shade to see it.',
                    cancelLabel: 'OK',
                  });
                } else {
                  notify(NOTIFICATIONS_OFF);
                }
              }}>
              <ThemedText type="linkPrimary">Send a test notification</ThemedText>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <ActionSheet
        visible={noticeOpen}
        title={notice?.title ?? ''}
        message={notice?.message}
        actions={notice?.actions ?? []}
        cancelLabel={notice?.cancelLabel}
        onClose={() => setNoticeOpen(false)}
      />
    </Sheet>
  );
}

type FormProps = {
  /** The item being edited; leave out to add a new one. */
  item?: Recurring;
  onDone?: () => void;
  /** Show a message or confirmation in the screen's sheet. */
  notify: (notice: SheetNotice) => void;
};

function RecurringForm({ item, onDone, notify }: FormProps) {
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const { categories, currency, addRecurring, updateRecurring, setRecurringPaused, deleteRecurring } =
    useExpenses();

  const [amount, setAmount] = useState(item ? centsToInput(item.amountCents) : '');
  const [title, setTitle] = useState(item?.title ?? '');
  const [category, setCategory] = useState(item?.category ?? 'bills');
  const [frequency, setFrequency] = useState<Frequency>(item?.frequency ?? 'monthly');
  const [weekday, setWeekday] = useState(() =>
    item?.frequency === 'weekly' ? item.day : new Date().getDay()
  );
  const [monthDay, setMonthDay] = useState(() =>
    String(item?.frequency === 'monthly' ? item.day : new Date().getDate())
  );
  // 'off', or how many days before the due day to remind ('0' = on the day).
  const [remind, setRemind] = useState(item?.remindDays == null ? 'off' : String(item.remindDays));
  const [error, setError] = useState('');
  const saving = useRef(false);

  async function chooseReminder(value: string) {
    // Ask for permission when it is first needed, not when the app opens.
    if (value !== 'off' && !(await ensureReminderPermission())) {
      notify(NOTIFICATIONS_OFF);
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
      const input = {
        title: title.trim(),
        amountCents,
        category,
        frequency,
        day: frequency === 'weekly' ? weekday : dayOfMonth,
        remindDays: remind === 'off' ? null : Number(remind),
      };
      if (item) {
        await updateRecurring(item.id, input);
        onDone?.();
      } else {
        await addRecurring(input);
        onDone?.();
      }
    } catch (failure) {
      console.warn('Could not save recurring expense', failure);
      notify(SOMETHING_WENT_WRONG('Could not save'));
    } finally {
      saving.current = false;
    }
  }

  async function togglePause(current: Recurring) {
    if (saving.current) return;
    saving.current = true;
    try {
      await setRecurringPaused(current.id, !current.paused);
      onDone?.();
    } catch (failure) {
      console.warn('Could not change the recurring expense', failure);
      notify(SOMETHING_WENT_WRONG('Could not update'));
    } finally {
      saving.current = false;
    }
  }

  function confirmStop(current: Recurring) {
    const label = current.title || getCategory(categories, current.category).label;
    notify({
      title: `Stop “${label}”?`,
      message: 'Expenses already logged stay in your history.',
      actions: [
        {
          label: 'Stop repeating',
          destructive: true,
          onPress: () => {
            void deleteRecurring(current.id);
            onDone?.();
          },
        },
      ],
      cancelLabel: 'Keep it',
    });
  }

  return (
    <View style={[styles.form, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="smallBold">
        {item ? 'Edit recurring expense' : 'New recurring expense'}
      </ThemedText>
      <TextInput
        style={[inputStyle, { backgroundColor: theme.backgroundSelected }]}
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
        style={[inputStyle, { backgroundColor: theme.backgroundSelected }]}
        value={title}
        onChangeText={setTitle}
        placeholder="Note (e.g. Rent)"
        maxLength={MAX_NOTE_LENGTH}
        placeholderTextColor={theme.textSecondary}
      />
      <CategoryChips value={category} onChange={setCategory} />
      <Segmented
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
                  onPress={() => setWeekday(index)}
                  style={[
                    styles.day,
                    { backgroundColor: selected ? theme.accent : theme.backgroundSelected },
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
            style={[
              inputStyle,
              styles.monthDayInput,
              { backgroundColor: theme.backgroundSelected },
            ]}
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
      <Pressable
        accessibilityRole="button"
        onPress={save}
        style={[styles.addButton, { backgroundColor: theme.accent }]}>
        <ThemedText type="smallBold" themeColor="onAccent">
          {item ? 'Save changes' : 'Add recurring expense'}
        </ThemedText>
      </Pressable>
      {!item && onDone && (
        <Pressable
          accessibilityRole="button"
          onPress={onDone}
          style={[styles.pauseButton, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="smallBold">Cancel</ThemedText>
        </Pressable>
      )}
      {item && (
        <Pressable
          accessibilityRole="button"
          onPress={() => void togglePause(item)}
          style={[styles.pauseButton, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="smallBold">{item.paused ? 'Resume' : 'Pause'}</ThemedText>
        </Pressable>
      )}
      {item?.paused && (
        <ThemedText type="small" themeColor="textSecondary">
          Paused: nothing is logged until you resume. Resuming doesn&apos;t add the days you missed.
        </ThemedText>
      )}
      {item && (
        <View style={styles.editActions}>
          <Pressable
            accessibilityRole="button"
            onPress={onDone}
            style={[styles.secondaryButton, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="smallBold">Cancel</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => confirmStop(item)}
            style={[styles.secondaryButton, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="smallBold" themeColor="danger">
              Stop repeating
            </ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three - 4,
  },
  empty: { textAlign: 'center', paddingVertical: Spacing.three },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    borderRadius: Spacing.three,
    padding: Spacing.three - 4,
  },
  itemEmoji: { fontSize: 22, lineHeight: 28 },
  itemText: { flex: 1 },
  paused: { opacity: 0.6 },
  form: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.three - 4 },
  days: { flexDirection: 'row', gap: Spacing.two },
  day: {
    minWidth: 48,
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: Spacing.three - 2,
    paddingVertical: Spacing.two,
  },
  monthDayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthDayInput: { width: 72, textAlign: 'center' },
  addButton: {
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: Spacing.three - 2,
  },
  editActions: { flexDirection: 'row', gap: Spacing.two },
  pauseButton: {
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: Spacing.three - 2,
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: Spacing.three - 2,
  },
});
