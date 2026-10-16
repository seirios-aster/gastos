import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Radius, Spacing, Touch } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  /** How many are picked, and how many there are to pick from. */
  count: number;
  total: number;
  onSelectAll: () => void;
  onDelete: () => void;
  onCancel: () => void;
};

/** The bar above the tab bar while picking several: "3 selected", Select all, Delete, and a way out. */
export function SelectionBar({ count, total, onSelectAll, onDelete, onCancel }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { lastDeleted } = useExpenses();
  const allPicked = count >= total;

  return (
    <View
      pointerEvents="box-none"
      // Sits above the Undo toast when both are showing.
      style={[
        styles.wrapper,
        { bottom: insets.bottom + BottomTabInset + Spacing.three + (lastDeleted ? 64 : 0) },
      ]}>
      <Animated.View
        entering={FadeInDown.duration(160)}
        style={[
          styles.bar,
          { backgroundColor: theme.backgroundElement, borderColor: theme.fieldBorder },
        ]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel selecting"
          onPress={onCancel}
          style={({ pressed }) => [styles.icon, pressed && styles.pressed]}>
          <SymbolView
            tintColor={theme.text}
            name={{ ios: 'xmark', android: 'close', web: 'close' }}
            size={20}
          />
        </Pressable>

        <ThemedText type="smallBold" style={styles.count} accessibilityLiveRegion="polite">
          {count} selected
        </ThemedText>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: allPicked }}
          disabled={allPicked}
          onPress={onSelectAll}
          style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}>
          <ThemedText type="smallBold" themeColor={allPicked ? 'textSecondary' : 'accent'}>
            Select all
          </ThemedText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={onDelete}
          style={({ pressed }) => [
            styles.delete,
            { backgroundColor: theme.backgroundSelected },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" themeColor="danger">
            Delete
          </ThemedText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    width: '100%',
    maxWidth: MaxContentWidth,
    borderRadius: Radius.card,
    borderWidth: 1,
    paddingVertical: Spacing.one,
    paddingLeft: Spacing.one,
    paddingRight: Spacing.two,
  },
  icon: { width: Touch.min, height: Touch.min, alignItems: 'center', justifyContent: 'center' },
  count: { flex: 1, minWidth: 0 },
  textButton: { minHeight: Touch.min, paddingHorizontal: Spacing.two, justifyContent: 'center' },
  delete: {
    minHeight: Touch.min,
    minWidth: 80,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
});
