import { SymbolView } from 'expo-symbols';
import { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useThemeTransition } from '@/components/theme-transition';
import { Radius, Touch } from '@/constants/theme';
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
  const choice = useThemeChoice();
  const { changeTheme, prepareChange, cancelPrepare } = useThemeTransition();
  const releaseTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Look" style={styles.group}>
      {THEME_CHOICES.map((option) => {
        const selected = option === choice;
        return (
          <Pressable
            key={option}
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
              selected && { backgroundColor: theme.backgroundSelected },
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

const styles = StyleSheet.create({
  group: { flexDirection: 'row', alignItems: 'center' },
  // 44dp tall (the touch minimum); the selected one is a pill behind the icon.
  segment: {
    minWidth: 40,
    minHeight: Touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },
  pressed: { opacity: 0.6 },
});
