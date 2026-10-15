import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { CategoryChips } from '@/components/category-chips';
import { Segmented } from '@/components/segmented';
import { Section } from '@/components/settings/section';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { useInputStyle } from '@/hooks/use-input-style';
import { useTheme } from '@/hooks/use-theme';
import { shortDateLabel } from '@/lib/dates';
import { getCategory } from '@/lib/expenses';
import { formatMoney, parseAmountToCents } from '@/lib/money';
import { describeSchedule, WEEKDAYS, type Frequency } from '@/lib/recurring';

export function RecurringSection() {
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const { recurring, categories, currency, addRecurring, deleteRecurring } = useExpenses();

  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('bills');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [weekday, setWeekday] = useState(() => new Date().getDay());
  const [monthDay, setMonthDay] = useState(() => String(new Date().getDate()));
  const [error, setError] = useState('');

  async function add() {
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
    await addRecurring({
      title: title.trim(),
      amountCents,
      category,
      frequency,
      day: frequency === 'weekly' ? weekday : dayOfMonth,
    });
    setAmount('');
    setTitle('');
    setError('');
  }

  function confirmStop(id: number, label: string) {
    Alert.alert(`Stop “${label}”?`, 'Expenses already logged stay in your history.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Stop repeating', style: 'destructive', onPress: () => void deleteRecurring(id) },
    ]);
  }

  return (
    <Section
      title="Recurring expenses"
      hint="Rent, subscriptions, a weekly allowance. They're logged automatically on the due day, even if you didn't open the app that day.">
      {recurring.map((item) => {
        const cat = getCategory(categories, item.category);
        const label = item.title || cat.label;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`${label}, ${describeSchedule(item)}. Tap to stop repeating`}
            onPress={() => confirmStop(item.id, label)}
            style={[styles.item, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={styles.itemEmoji}>{cat.emoji}</ThemedText>
            <View style={styles.itemText}>
              <ThemedText numberOfLines={1}>{label}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {describeSchedule(item)} · next {shortDateLabel(item.nextDue)}
              </ThemedText>
            </View>
            <ThemedText type="smallBold">{formatMoney(item.amountCents, currency)}</ThemedText>
          </Pressable>
        );
      })}

      <View style={[styles.form, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="smallBold">New recurring expense</ThemedText>
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
              style={[inputStyle, styles.monthDayInput, { backgroundColor: theme.backgroundSelected }]}
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
        {error ? (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={add}
          style={[styles.addButton, { backgroundColor: theme.accent }]}>
          <ThemedText type="smallBold" themeColor="onAccent">
            Add recurring expense
          </ThemedText>
        </Pressable>
      </View>
    </Section>
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
});
