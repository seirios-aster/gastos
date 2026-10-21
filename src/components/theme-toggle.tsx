import { SymbolView } from 'expo-symbols';
import { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useThemeTransition } from '@/components/theme-transition';
import { Radius, Spacing } from '@/constants/theme';
import { useGlass } from '@/hooks/use-glass';
import { useTheme } from '@/hooks/use-theme';
import { tick } from '@/lib/haptics';
import { THEME_CHOICES, type ThemeChoice } from '@/lib/theme-choice';
import { useThemeChoice } from '@/lib/theme-preference';

const LABELS: Record<ThemeChoice, string> = { light: 'Light', dark: 'Dark', glass: 'Glass' };
const SYMBOLS = {
  light: { ios: 'sun.max', android: 'light_mode', web: 'light_mode' },
  dark: { ios: 'moon', android: 'dark_mode', web: 'dark_mode' },
  glass: { ios: 'drop', android: 'water_drop', web: 'water_drop' },
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

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Look"
      style={[styles.group, { backgroundColor: theme.backgroundElement, borderColor: theme.fieldBorder }, glass.chip]}>
      {THEME_CHOICES.map((option) => {
        const selected = option === choice;
        return (
          <Pressable
            key={option}
            hitSlop={{ top: 4, bottom: 4 }}
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
              selected && { backgroundColor: theme.primaryFill },
              pressed && styles.pressed,
            ]}>
            <SymbolView
              tintColor={selected ? theme.onPrimary : theme.textSecondary}
              name={SYMBOLS[option]}
              size={22}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // One pill holding all three choices, with the chosen one raised inside it.
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    gap: 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
    marginRight: Spacing.one,
  },
  segment: {
    width: 40,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },
  pressed: { opacity: 0.6 },
});
