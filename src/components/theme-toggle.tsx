import { useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemeIcon } from '@/components/theme-icon';
import { useThemeTransition } from '@/components/theme-transition';
import { Touch } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { tick } from '@/lib/haptics';

/**
 * The light/dark switch in the header: a moon in light mode, a sun in dark mode (the one you get
 * by tapping). Tapping fades the whole app to the other theme and remembers the choice.
 */
export function ThemeToggle() {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const { changeTheme, prepareChange, cancelPrepare } = useThemeTransition();
  const releaseTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  return (
    // Already 44dp square, so no hitSlop: it would overlap the Settings button next to it.
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel="Dark mode"
      accessibilityState={{ checked: dark }}
      // The screen picture is taken as soon as the finger lands, so the fade can begin right after
      // it lifts. A touch that ends without a tap (the finger slid away) drops that picture again.
      onPressIn={() => {
        clearTimeout(releaseTimer.current);
        prepareChange();
      }}
      onPressOut={() => {
        // A real tap calls onPress just after this, which makes the cancel below do nothing.
        releaseTimer.current = setTimeout(cancelPrepare, 150);
      }}
      onPress={() => {
        tick();
        changeTheme(dark ? 'light' : 'dark');
      }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <ThemeIcon dark={dark} color={theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minWidth: Touch.min, minHeight: Touch.min, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
});
