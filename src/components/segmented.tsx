import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, Touch } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { tick } from '@/lib/haptics';

type Props<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** What the choice is about, read out by screen readers, e.g. "Chart range". */
  accessibilityLabel?: string;
};

/** A compact two-or-three way toggle. Each segment is 44dp high. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: Props<T>) {
  const theme = useTheme();

  return (
    <ThemedView
      type="backgroundSelected"
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={styles.track}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => {
              if (!selected) tick();
              onChange(option.value);
            }}
            style={({ pressed }) => [
              styles.segment,
              selected && { backgroundColor: theme.accent },
              pressed && styles.pressed,
            ]}>
            {/* Two lines allowed: "Day before" must not be cut off at a big font size. */}
            <ThemedText
              type="smallBold"
              numberOfLines={2}
              style={styles.label}
              themeColor={selected ? 'onAccent' : 'text'}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: Radius.pill,
    padding: Spacing.half,
  },
  segment: {
    flex: 1,
    minHeight: Touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
  },
  pressed: { opacity: 0.8 },
  label: { textAlign: 'center' },
});
