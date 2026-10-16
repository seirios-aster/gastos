import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { AccessibilityInfo, Alert, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Radius, Spacing, Touch } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { useTheme } from '@/hooks/use-theme';

/** A snackbar above the tab bar that offers to bring back the expense that was just deleted. */
export function UndoToast() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { lastDeleted, undoDelete, dismissUndo } = useExpenses();

  useEffect(() => {
    if (lastDeleted) AccessibilityInfo.announceForAccessibility('Expense deleted. Undo available.');
  }, [lastDeleted]);

  if (!lastDeleted) return null;

  return (
    // box-none keeps the empty margins around the toast from swallowing taps meant for the screen.
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: insets.bottom + BottomTabInset + Spacing.three }]}>
      <Animated.View
        entering={FadeInDown.duration(200)}
        style={[styles.toast, { backgroundColor: theme.text }]}>
        <ThemedText type="small" themeColor="background" style={styles.message}>
          Expense deleted
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            undoDelete().catch((error) => {
              console.warn('Could not undo the delete', error);
              Alert.alert('Could not undo', 'The expense was not restored.');
            });
          }}
          style={({ pressed }) => [
            styles.undo,
            { backgroundColor: theme.accent },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" themeColor="onAccent">
            Undo
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={dismissUndo}
          style={({ pressed }) => [styles.dismiss, pressed && styles.pressed]}>
          <SymbolView
            tintColor={theme.background}
            name={{ ios: 'xmark', android: 'close', web: 'close' }}
            size={16}
          />
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
    paddingHorizontal: Spacing.four,
  },
  toast: {
    width: '100%',
    maxWidth: MaxContentWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.card,
    paddingVertical: Spacing.one,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.one,
  },
  message: { flex: 1 },
  undo: {
    minHeight: Touch.min,
    justifyContent: 'center',
    borderRadius: Radius.row,
    paddingHorizontal: Spacing.three,
  },
  dismiss: { minWidth: Touch.min, minHeight: Touch.min, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.8 },
});
