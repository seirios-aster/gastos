import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/** A compact two-or-three way toggle. */
export function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundSelected" style={styles.track}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && { backgroundColor: theme.accent }]}>
            <ThemedText type="smallBold" themeColor={selected ? 'onAccent' : 'text'}>
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
    borderRadius: 999,
    padding: 3,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
  },
});
