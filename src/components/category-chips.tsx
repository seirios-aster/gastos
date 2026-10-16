import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Touch } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { useTheme } from '@/hooks/use-theme';
import { tick } from '@/lib/haptics';

type Props = {
  value: string;
  onChange: (id: string) => void;
  /**
   * How far the row reaches past the content on both sides, so the chips scroll right up to the
   * edge of the card or screen instead of being cut off at its padding. Pass the padding of
   * whatever the chips sit in (16 inside a card, 24 on a sheet). Leave out for no bleed.
   */
  bleed?: number;
};

export function CategoryChips({ value, onChange, bleed = 0 }: Props) {
  const theme = useTheme();
  const { categories } = useExpenses();
  const scrollRef = useRef<ScrollView>(null);
  const positions = useRef<Record<string, number>>({});
  // Where the selected chip rests: the row's own padding, or the usual 16 when there is no bleed.
  const inset = bleed || Spacing.three;

  // Keep the selected chip in view, e.g. a default that sits off-screen to the right.
  useEffect(() => {
    const x = positions.current[value];
    if (x !== undefined) scrollRef.current?.scrollTo({ x: Math.max(0, x - inset), animated: true });
  }, [value, inset]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={bleed ? { marginHorizontal: -bleed } : undefined}
      contentContainerStyle={[styles.row, bleed ? { paddingHorizontal: bleed } : null]}>
      {categories.map((category) => {
        const selected = category.id === value;
        return (
          <Pressable
            key={category.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => {
              if (!selected) tick();
              onChange(category.id);
            }}
            onLayout={(event) => {
              positions.current[category.id] = event.nativeEvent.layout.x;
              if (selected) {
                scrollRef.current?.scrollTo({
                  x: Math.max(0, event.nativeEvent.layout.x - inset),
                  animated: false,
                });
              }
            }}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: selected ? theme.accent : theme.backgroundSelected },
              pressed && styles.pressed,
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
    gap: Spacing.two,
    minHeight: Touch.min,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  pressed: { opacity: 0.8 },
});
