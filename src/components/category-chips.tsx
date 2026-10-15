import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CATEGORIES, type CategoryId } from '@/lib/expenses';

type Props = {
  value: CategoryId;
  onChange: (id: CategoryId) => void;
};

export function CategoryChips({ value, onChange }: Props) {
  const theme = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.row}>
      {CATEGORIES.map((category) => {
        const selected = category.id === value;
        return (
          <Pressable
            key={category.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(category.id)}
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
