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

/** Switch the whole app to this theme and remember it. This is the instant version, with no fade. */
export function setTheme(choice: ThemeChoice) {
  // Missing on react-native-web, which only the preview uses; the phone always has it.
  Appearance.setColorScheme?.(choice);
  try {
    Storage.setItemSync(THEME_KEY, choice);
  } catch (error) {
    console.warn('Could not save the theme', error);
  }
}

/** The theme the app is showing right now. */
export function currentTheme(): ThemeChoice {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

/**
 * Call `listener` once the phone reports that the app is now in `theme`. On Android that report
 * arrives a moment AFTER setTheme(), because the system has to switch first.
 * Returns a function that stops listening.
 */
export function onThemeReported(theme: ThemeChoice, listener: () => void): () => void {
  const subscription = Appearance.addChangeListener(({ colorScheme }) => {
    if (colorScheme === theme) listener();
  });
  return () => subscription.remove();
}
