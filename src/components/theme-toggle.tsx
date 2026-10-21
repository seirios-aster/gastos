import { SymbolView } from 'expo-symbols';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useThemeTransition } from '@/components/theme-transition';
import { Radius } from '@/constants/theme';
import { useGlass } from '@/hooks/use-glass';
import { useTheme } from '@/hooks/use-theme';
import { tick } from '@/lib/haptics';
import { THEME_CHOICES, type ThemeChoice } from '@/lib/theme-choice';
import { useThemeChoice } from '@/lib/theme-preference';

const LABELS: Record<ThemeChoice, string> = { light: 'Light', dark: 'Dark', glass: 'Glass' };
const SYMBOLS = {
  light: { ios: 'sun.max', android: 'light_mode', web: 'light_mode' },
  dark: { ios: 'moon', android: 'dark_mode', web: 'dark_mode' },
  glass: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
} as const;

/**
 * The look switch in the header: one control with three choices, sun for Light, moon for Dark and
 * a drop for Glass. Light and Dark are the plain look; Glass is the see-through one. Tapping fades
 * the whole app to the chosen look and remembers it.
 */
export function ThemeToggle() {
  const theme = useTheme();
  const glass = useGlass();
  const choice = useThemeChoice();
  const { changeTheme, prepareChange, cancelPrepare } = useThemeTransition();
  const releaseTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // One thumb that glides under the chosen icon, so the three choices behave like a single switch.
  const index = THEME_CHOICES.indexOf(choice);
  const position = useSharedValue(index);
  useEffect(() => {
    position.set(withSpring(index, { damping: 18, stiffness: 260 }));
  }, [index, position]);
  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: position.get() * (SEGMENT + GAP) }],
  }));

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Look"
      style={[styles.group, { backgroundColor: theme.backgroundElement, borderColor: theme.fieldBorder }, glass.chip]}>
      <Animated.View
        pointerEvents="none"
        style={[styles.thumb, { backgroundColor: theme.backgroundSelected }, glass.selected, thumb]}
      />
      {THEME_CHOICES.map((option) => {
        const selected = option === choice;
        return (
          <Pressable
            key={option}
            hitSlop={{ top: 2, bottom: 2 }}
            accessibilityRole="radio"
            accessibilityLabel={LABELS[option]}
            accessibilityState={{ checked: selected }}
            // The screen picture is taken as soon as the finger lands, so the fade can begin right
            // after it lifts. A touch that ends without a tap (the finger slid away) drops it again.
            onPressIn={() => {
              clearTimeout(releaseTimer.current);
              if (!selected) prepareChange();
            }}
            onPressOut={() => {
              // A real tap calls onPress just after this, which makes the cancel below do nothing.
              releaseTimer.current = setTimeout(cancelPrepare, 150);
            }}
            onPress={() => {
              if (selected) return;
              tick();
              changeTheme(option);
            }}
            style={({ pressed }) => [
              styles.segment,
              pressed && styles.pressed,
            ]}>
            <SymbolView
              tintColor={selected ? theme.text : theme.textSecondary}
              name={SYMBOLS[option]}
              size={22}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const SEGMENT = 40;
const GAP = 2;
const PADDING = 2;

const styles = StyleSheet.create({
  // One pill holding all three choices; the thumb slides inside it.
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: PADDING,
    gap: GAP,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  thumb: {
    position: 'absolute',
    left: PADDING,
    top: PADDING,
    width: SEGMENT,
    height: SEGMENT,
    borderRadius: Radius.pill,
  },
  segment: {
    width: SEGMENT,
    height: SEGMENT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },
  pressed: { opacity: 0.6 },
});
