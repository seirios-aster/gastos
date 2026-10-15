import { useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { CategoryChips } from '@/components/category-chips';
import { FieldError } from '@/components/field-error';
import { Segmented } from '@/components/segmented';
import { Section } from '@/components/settings/section';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { useInputStyle } from '@/hooks/use-input-style';
import { useTheme } from '@/hooks/use-theme';
import { shortDateLabel } from '@/lib/dates';
import { getCategory, MAX_NOTE_LENGTH } from '@/lib/expenses';
import { centsToInput, formatMoney, parseAmountToCents } from '@/lib/money';
import { describeSchedule, WEEKDAYS, type Frequency, type Recurring } from '@/lib/recurring';

export function RecurringSection() {
  const theme = useTheme();
  const { recurring, categories, currency } = useExpenses();
  const [editingId, setEditingId] = useState<number | null>(null);

  return (
    <Section
      title="Recurring expenses"
      hint="Rent, subscriptions, a weekly allowance. They're logged automatically on the due day, even if you didn't open the app that day. Tap one to change it.">
      {recurring.map((item) => {
        // The form opens in the row's place so the edit is where the person tapped.
        if (item.id === editingId) {
          return <RecurringForm key={item.id} item={item} onDone={() => setEditingId(null)} />;
        }
        const cat = getCategory(categories, item.category);
        const label = item.title || cat.label;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`${label}, ${formatMoney(item.amountCents, currency)}, ${describeSchedule(item)}, ${item.paused ? 'paused' : `next ${shortDateLabel(item.nextDue)}`}`}
            accessibilityHint="Opens the editor"
            onPress={() => setEditingId(item.id)}
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
                  : `${describeSchedule(item)} · next ${shortDateLabel(item.nextDue)}`}
              </ThemedText>
            </View>
            <ThemedText type="smallBold">{formatMoney(item.amountCents, currency)}</ThemedText>
          </Pressable>
        );
      })}

      <RecurringForm />
    </Section>
  );
}

type FormProps = {
  /** The item being edited; leave out to add a new one. */
  item?: Recurring;
  onDone?: () => void;
};

function RecurringForm({ item, onDone }: FormProps) {
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
  const [error, setError] = useState('');
  const saving = useRef(false);

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
      };
      if (item) {
        await updateRecurring(item.id, input);
        onDone?.();
      } else {
        await addRecurring(input);
        setAmount('');
        setTitle('');
        setError('');
      }
    } catch (failure) {
      console.warn('Could not save recurring expense', failure);
      Alert.alert('Could not save', 'Something went wrong. Please try again.');
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
      Alert.alert('Could not update', 'Something went wrong. Please try again.');
    } finally {
      saving.current = false;
    }
  }

  function confirmStop(current: Recurring) {
    const label = current.title || getCategory(categories, current.category).label;
    Alert.alert(`Stop “${label}”?`, 'Expenses already logged stay in your history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Stop repeating',
        style: 'destructive',
        onPress: () => {
          void deleteRecurring(current.id);
          onDone?.();
        },
      },
    ]);
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
      {error ? <FieldError>{error}</FieldError> : null}
      <Pressable
        accessibilityRole="button"
        onPress={save}
        style={[styles.addButton, { backgroundColor: theme.accent }]}>
        <ThemedText type="smallBold" themeColor="onAccent">
          {item ? 'Save changes' : 'Add recurring expense'}
        </ThemedText>
      </Pressable>
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
