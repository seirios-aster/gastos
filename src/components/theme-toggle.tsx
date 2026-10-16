import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { setTheme } from '@/lib/theme-preference';

/** A moon in light mode and a sun in dark mode; tapping flips the whole app and remembers it. */
export function ThemeToggle() {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      hitSlop={8}
      onPress={() => setTheme(dark ? 'light' : 'dark')}
      style={styles.button}>
      <SymbolView
        tintColor={theme.text}
        name={
          dark
            ? { ios: 'sun.max', android: 'light_mode', web: 'light_mode' }
            : { ios: 'moon', android: 'dark_mode', web: 'dark_mode' }
        }
        size={24}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
