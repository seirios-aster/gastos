/**
 * The three looks the person can pick in the header: Light and Dark (the plain, solid look in sky
 * blue) and Glass (the see-through look, always dark). Plain data with no React Native imports, so
 * the tests can read it.
 */
export type ThemeChoice = 'light' | 'dark' | 'glass';

export const THEME_CHOICES: readonly ThemeChoice[] = ['light', 'dark', 'glass'];

/** Glass is the app's signature look, so it is what a fresh install starts in. */
export const DEFAULT_THEME: ThemeChoice = 'glass';

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === 'light' || value === 'dark' || value === 'glass';
}

/** What the phone itself is told (for the status bar, keyboard and system dialogs). Glass is dark. */
export function nativeScheme(choice: ThemeChoice): 'light' | 'dark' {
  return choice === 'light' ? 'light' : 'dark';
}

/**
 * The choice to start with. `saved` is the new setting; `legacy` is the old light/dark setting
 * from before there were three looks. Back then "dark" WAS the glass look, so it carries over as
 * Glass, and an old "light" becomes the plain Light look.
 */
export function resolveSavedChoice(saved: unknown, legacy: unknown): ThemeChoice {
  if (isThemeChoice(saved)) return saved;
  if (legacy === 'light') return 'light';
  return DEFAULT_THEME;
}
