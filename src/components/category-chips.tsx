import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  value: string;
  onChange: (id: string) => void;
};

export function CategoryChips({ value, onChange }: Props) {
  const theme = useTheme();
  const { categories } = useExpenses();
  const scrollRef = useRef<ScrollView>(null);
  const positions = useRef<Record<string, number>>({});

  // Keep the selected chip in view, e.g. a default that sits off-screen to the right.
  useEffect(() => {
    const x = positions.current[value];
    if (x !== undefined) scrollRef.current?.scrollTo({ x: Math.max(0, x - Spacing.three), animated: true });
  }, [value]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.row}>
      {categories.map((category) => {
        const selected = category.id === value;
        return (
          <Pressable
            key={category.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(category.id)}
            onLayout={(event) => {
              positions.current[category.id] = event.nativeEvent.layout.x;
              if (selected) {
                scrollRef.current?.scrollTo({
                  x: Math.max(0, event.nativeEvent.layout.x - Spacing.three),
                  animated: false,
                });
              }
            }}
            style={[
              styles.chip,
              { backgroundColor: selected ? theme.accent : theme.backgroundSelected },
            ]}>
            <ThemedText type="small">{category.emoji}</ThemedText>
            <ThemedText type="small" themeColor={selected ? 'onAccent' : 'text'}>
              {category.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    paddingHorizontal: Spacing.three - 2,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
});
