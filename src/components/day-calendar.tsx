import { Pressable, StyleSheet, View } from 'react-native';

import { Numeric, ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, Touch } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dayOfMonth, isPickable, monthWeeks } from '@/lib/calendar';
import { shortDateLabel } from '@/lib/dates';
import { formatMoney } from '@/lib/money';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type Props = {
  monthTs: number;
  /** Money spent on each day of the month (index 0 is the 1st). */
  totals: number[];
  /** The day number picked, or null. */
  selectedDay: number | null;
  now: number;
  currency: string;
  onPick: (day: number) => void;
};

/**
 * The month as a calendar. A dot marks days with spending, and tapping a day shows it below.
 * Today and later days are dimmed and cannot be picked: today lives in the Today tab.
 */
export function DayCalendar({ monthTs, totals, selectedDay, now, currency, onPick }: Props) {
  const theme = useTheme();
  const weeks = monthWeeks(monthTs);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.week}>
        {WEEKDAYS.map((name, index) => (
          <View key={index} style={styles.cell} accessibilityElementsHidden importantForAccessibility="no">
            <ThemedText type="caption" themeColor="textSecondary">
              {name}
            </ThemedText>
          </View>
        ))}
      </View>
      {weeks.map((week, row) => (
        <View key={row} style={styles.week}>
          {week.map((day, column) => {
            if (day === null) return <View key={column} style={styles.cell} />;
            const spent = totals[day - 1] ?? 0;
            const pickable = isPickable(monthTs, day, now);
            const selected = day === selectedDay;
            const label = `${shortDateLabel(dayOfMonth(monthTs, day))}, ${
              spent > 0 ? `${formatMoney(spent, currency)} spent` : 'nothing spent'
            }`;
            return (
              <View key={column} style={styles.cell}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected, disabled: !pickable }}
                  disabled={!pickable}
                  onPress={() => onPick(day)}
                  style={({ pressed }) => [
                    styles.day,
                    selected && { backgroundColor: theme.accent },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText
                    type="smallBold"
                    style={Numeric}
                    themeColor={selected ? 'onAccent' : pickable ? 'text' : 'textSecondary'}>
                    {day}
                  </ThemedText>
                  <View
                    style={[
                      styles.dot,
                      spent > 0 && { backgroundColor: selected ? theme.onAccent : theme.accent },
                    ]}
                  />
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.card, padding: Spacing.two },
  week: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 28 },
  day: {
    width: Touch.min,
    height: Touch.min,
    borderRadius: Touch.min / 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  pressed: { opacity: 0.7 },
});
