import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';

import { DEFAULT_THEME, nativeScheme, resolveSavedChoice, type ThemeChoice } from './theme-choice';

export type { ThemeChoice };

/** The current setting (Light, Dark or Glass). The old light/dark key is still read once, to carry it over. */
const THEME_KEY = 'appearance';
const LEGACY_THEME_KEY = 'theme';

let choice: ThemeChoice = DEFAULT_THEME;
const listeners = new Set<() => void>();

function publish(next: ThemeChoice) {
  choice = next;
  listeners.forEach((listener) => listener());
}

/**
 * Apply the look the user picked last time; with nothing saved the app starts in Glass, whatever
 * the phone is set to. Call once at startup, before the first screen renders, so there is no flash
 * of the wrong look.
 */
export function applySavedTheme() {
  let next: ThemeChoice = DEFAULT_THEME;
  try {
    next = resolveSavedChoice(Storage.getItemSync(THEME_KEY), Storage.getItemSync(LEGACY_THEME_KEY));
  } catch (error) {
    console.warn('Could not read the saved theme', error);
  }
  Appearance.setColorScheme?.(nativeScheme(next));
  publish(next);
}

/** Switch the whole app to this look and remember it. This is the instant version, with no fade. */
export function setTheme(next: ThemeChoice) {
  // Missing on react-native-web, which only the preview uses; the phone always has it.
  Appearance.setColorScheme?.(nativeScheme(next));
  try {
    Storage.setItemSync(THEME_KEY, next);
  } catch (error) {
    console.warn('Could not save the theme', error);
  }
  publish(next);
}

/** The look the app is showing right now. */
export function currentTheme(): ThemeChoice {
  return choice;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The look the app is showing; components re-render when it changes. */
export function useThemeChoice(): ThemeChoice {
  return useSyncExternalStore(subscribe, currentTheme, currentTheme);
}

/** True in the Glass look: the see-through cards, the colored shapes behind them and the glass effects. */
export function useIsGlass(): boolean {
  return useThemeChoice() === 'glass';
}

/**
 * Call `listener` once the phone reports that it is showing the scheme for `theme`. On Android
 * that report arrives a moment AFTER setTheme(), because the system has to switch first. Between
 * Dark and Glass the phone's scheme does not change at all, so there is nothing to wait for.
 * Returns a function that stops listening.
 */
export function onThemeReported(theme: ThemeChoice, listener: () => void): () => void {
  const target = nativeScheme(theme);
  if (Appearance.getColorScheme() === target) {
    const id = setTimeout(listener, 0);
    return () => clearTimeout(id);
  }
  const subscription = Appearance.addChangeListener(({ colorScheme }) => {
    if (colorScheme === target) listener();
  });
  return () => subscription.remove();
}
