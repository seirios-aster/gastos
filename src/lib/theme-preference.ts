import Storage from 'expo-sqlite/kv-store';
import { Appearance } from 'react-native';

const THEME_KEY = 'theme';

export type ThemeChoice = 'light' | 'dark';

/**
 * Apply the theme the user picked last time. With nothing saved the app keeps following the phone.
 * Call once at startup, before the first screen renders, so there is no flash of the wrong theme.
 */
export function applySavedTheme() {
  try {
    const saved = Storage.getItemSync(THEME_KEY);
    if (saved === 'light' || saved === 'dark') Appearance.setColorScheme?.(saved);
  } catch (error) {
    console.warn('Could not read the saved theme', error);
  }
}

/** Switch the whole app to this theme and remember it. */
export function setTheme(choice: ThemeChoice) {
  // Missing on react-native-web, which only the preview uses; the phone always has it.
  Appearance.setColorScheme?.(choice);
  try {
    Storage.setItemSync(THEME_KEY, choice);
  } catch (error) {
    console.warn('Could not save the theme', error);
  }
}
