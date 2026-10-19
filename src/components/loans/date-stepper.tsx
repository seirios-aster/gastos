import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, Touch } from '@/constants/theme';
import { addDays, dayLabel, startOfDay } from '@/lib/dates';

type Props = {
  /** The chosen day (ms). */
  value: number;
  onChange: (next: number) => void;
  /** What the date is, for screen readers: "Date lent", "Due date". */
  label: string;
  now: number;
  /** Stop stepping past these days. */
  min?: number;
  max?: number;
};

/** A day with ‹ › buttons to move it by one day, like the date row of the expense editor. */
export function DateStepper({ value, onChange, label, now, min, max }: Props) {
  const canEarlier = min === undefined || startOfDay(value) > startOfDay(min);
  const canLater = max === undefined || startOfDay(value) < startOfDay(max);

  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: previous day`}
        disabled={!canEarlier}
        onPress={() => onChange(addDays(value, -1))}
        style={({ pressed }) => [styles.arrowButton, pressed && styles.pressed]}>
        <ThemedText style={[styles.arrow, !canEarlier && styles.disabled]}>‹</ThemedText>
      </Pressable>
      <ThemedText style={styles.text} accessibilityLabel={`${label}: ${dayLabel(value, now)}`}>
        {dayLabel(value, now)}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: next day`}
        disabled={!canLater}
        onPress={() => onChange(addDays(value, 1))}
        style={({ pressed }) => [styles.arrowButton, pressed && styles.pressed]}>
        <ThemedText style={[styles.arrow, !canLater && styles.disabled]}>›</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.one,
  },
  arrowButton: { width: Touch.min, height: Touch.min, alignItems: 'center', justifyContent: 'center' },
  arrow: { fontSize: 28, lineHeight: 32 },
  text: { flex: 1, textAlign: 'center' },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.3 },
});
