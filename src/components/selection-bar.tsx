import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
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

/**
 * While picking several: a bar fixed at the top (the header's place, so no row is hidden) with a
 * way out, "3 selected" and Select all, plus a Delete button floating above the tab bar where the
 * thumb is.
 */
export function SelectionBar({ count, total, onSelectAll, onDelete, onCancel }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { lastDeleted } = useExpenses();
  const allPicked = count >= total;

  return (
    <>
      <Animated.View
        entering={FadeIn.duration(140)}
        style={[
          styles.top,
          {
            paddingTop: insets.top,
            backgroundColor: theme.background,
            borderBottomColor: theme.fieldBorder,
          },
        ]}>
        <View style={styles.topRow}>
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

          <ThemedText type="subtitle" style={styles.count} accessibilityLiveRegion="polite">
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
        </View>
      </Animated.View>

      <View
        pointerEvents="box-none"
        // Sits above the Undo toast when both are showing.
        style={[
          styles.deleteWrap,
          { bottom: insets.bottom + BottomTabInset + Spacing.three + (lastDeleted ? 64 : 0) },
        ]}>
        <Animated.View entering={FadeInDown.duration(160)}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete ${count} selected`}
            disabled={count === 0}
            onPress={onDelete}
            style={({ pressed }) => [
              styles.delete,
              { backgroundColor: theme.danger, opacity: count === 0 ? 0.4 : pressed ? 0.8 : 1 },
            ]}>
            <ThemedText type="smallBold" style={{ color: theme.background }}>
              Delete{count > 0 ? ` (${count})` : ''}
            </ThemedText>
          </Pressable>
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    width: '100%',
    maxWidth: MaxContentWidth,
    minHeight: 64,
    paddingHorizontal: Spacing.two,
  },
  icon: { width: Touch.min, height: Touch.min, alignItems: 'center', justifyContent: 'center' },
  count: { flex: 1, minWidth: 0 },
  textButton: { minHeight: Touch.min, paddingHorizontal: Spacing.two, justifyContent: 'center' },
  deleteWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.three,
  },
  delete: {
    minHeight: Touch.min,
    minWidth: 120,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  pressed: { opacity: 0.7 },
});
