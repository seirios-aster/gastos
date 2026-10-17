import { Pressable, StyleSheet, View } from 'react-native';

import { SelectMark } from '@/components/select-mark';
import { ThemedText, Numeric } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { useTheme } from '@/hooks/use-theme';
import { daysBetween, dueLabel } from '@/lib/dates';
import { getCategory } from '@/lib/expenses';
import { formatMoney } from '@/lib/money';
import { describeReminder, describeSchedule, type Recurring } from '@/lib/recurring';

type Props = {
  item: Recurring;
  /** The current time, so "Tomorrow" stays right after midnight. */
  now: number;
  /** Opens the editor, or picks the row while others are being picked. */
  onPress: () => void;
  /** Holding a row starts picking several. */
  onLongPress?: () => void;
  /** True while picking several: rows show a tick circle and tapping picks them. */
  selecting?: boolean;
  selected?: boolean;
};

/**
 * One recurring item. A paused item is muted with the secondary text color and a "Paused" tag, not
 * with opacity: fading the whole row dropped its small text to about 2.5:1 contrast.
 */
export function RecurringRow({ item, now, onPress, onLongPress, selecting = false, selected = false }: Props) {
  const theme = useTheme();
  const { categories, currency } = useExpenses();
  const category = getCategory(categories, item.category);
  const label = item.title || category.label;
  const money = formatMoney(item.amountCents, currency);
  const when = dueLabel(item.nextDue, now);
  const soon = daysBetween(now, item.nextDue) <= 1;
  const muted = item.paused ? 'textSecondary' : 'text';

  return (
    <Pressable
      accessibilityRole={selecting ? 'checkbox' : 'button'}
      accessibilityState={selecting ? { checked: selected } : undefined}
      accessibilityLabel={[
        label,
        money,
        describeSchedule(item),
        item.paused ? 'paused' : `next ${when}`,
        item.remindDays === null ? '' : describeReminder(item.remindDays),
      ]
        .filter(Boolean)
        .join(', ')}
      accessibilityHint={selecting ? 'Tap to pick or unpick' : 'Opens the editor. Hold to pick several.'}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type="backgroundElement"
        style={[styles.row, selected && { backgroundColor: theme.accentSoft }]}>
        {selecting ? (
          <View style={styles.icon}>
            <SelectMark selected={selected} />
          </View>
        ) : (
          <ThemedView type="backgroundSelected" style={styles.icon}>
            <ThemedText style={styles.emoji}>{category.emoji}</ThemedText>
          </ThemedView>
        )}
        <View style={styles.text}>
          <ThemedText numberOfLines={1} themeColor={muted}>
            {label}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {describeSchedule(item)}
          </ThemedText>
        </View>
        <View style={styles.right}>
          <ThemedText type="defaultBold" themeColor={muted} style={Numeric}>
            {money}
          </ThemedText>
          {item.paused ? (
            <ThemedView type="backgroundSelected" style={styles.tag}>
              <ThemedText type="caption" style={styles.tagText}>
                Paused
              </ThemedText>
            </ThemedView>
          ) : (
            <ThemedText
              type={soon ? 'smallBold' : 'small'}
              themeColor={soon ? 'accent' : 'textSecondary'}>
              {item.remindDays === null ? '' : '🔔 '}
              {when}
            </ThemedText>
          )}
        </View>
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
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 18, lineHeight: 24 },
  text: { flex: 1, minWidth: 0 },
  right: { alignItems: 'flex-end' },
  tag: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  tagText: { fontWeight: 700 },
});
