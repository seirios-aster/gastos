import { Pressable, StyleSheet, View } from 'react-native';

import { Numeric, ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { dueText, type PersonGroup } from '@/lib/loans';
import { formatMoney } from '@/lib/money';

type Props = {
  group: PersonGroup;
  now: number;
  currency: string;
  onPress: () => void;
};

/** One person: a letter badge, their name, what is open, and how much (with who owes whom). */
export function PersonRow({ group, now, currency, onPress }: Props) {
  const settled = group.openCount === 0;
  const owesYou = group.netCents > 0;
  const nextDue = group.loans
    .map((loan) => dueText(loan, now))
    .find((text) => text !== null && group.overdue === text.endsWith('overdue'));

  const detail = settled
    ? 'All settled'
    : [`${group.openCount} open ${group.openCount === 1 ? 'loan' : 'loans'}`, nextDue].filter(Boolean).join(' · ');
  const who = settled ? '' : group.netCents === 0 ? 'even' : owesYou ? 'owes you' : 'you owe';
  const money = formatMoney(Math.abs(group.netCents), currency);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[group.person, settled ? 'all settled' : `${who} ${money}`, detail].join(', ')}
      accessibilityHint="Opens the loans with this person"
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.row}>
        <ThemedView type="backgroundSelected" style={styles.badge}>
          <ThemedText type="defaultBold" accessibilityElementsHidden importantForAccessibility="no">
            {group.person.charAt(0).toUpperCase()}
          </ThemedText>
        </ThemedView>
        <View style={styles.text}>
          <ThemedText numberOfLines={1} themeColor={settled ? 'textSecondary' : 'text'}>
            {group.person}
          </ThemedText>
          <ThemedText
            type="small"
            themeColor={group.overdue ? 'danger' : 'textSecondary'}
            numberOfLines={1}>
            {detail}
          </ThemedText>
        </View>
        {!settled && (
          <View style={styles.right}>
            <ThemedText type="defaultBold" style={Numeric}>
              {money}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {who}
            </ThemedText>
          </View>
        )}
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.mid,
    minHeight: 64,
    borderRadius: Radius.row,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.mid,
  },
  badge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0 },
  right: { alignItems: 'flex-end' },
});
