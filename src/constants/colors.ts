/**
 * The app's colors, light and dark. Plain data with no React Native imports, so the unit tests can
 * check the contrast of every pair (src/lib/__tests__/contrast.test.ts). Import them from
 * '@/constants/theme', which re-exports them.
 */
import { DEFAULT_ACCENT, deriveAccent, type AccentSet } from './accent';
import { Neutrals, surfacesFor, type Surfaces } from './neutrals';

type Strings<T> = { [K in keyof T]: string };

export type Palette = Strings<(typeof Neutrals)['light']> &
  Surfaces &
  Omit<AccentSet, 'glows'> & { glowA: string; glowB: string; glowC: string; glowD: string; glowE: string };

/** The full palette for one theme with this accent (any #rrggbb). */
export function paletteFor(scheme: 'light' | 'dark', accent: string = DEFAULT_ACCENT): Palette {
  const { glows, ...derived } = deriveAccent(accent)[scheme];
  const [glowA, glowB, glowC, glowD, glowE] = glows;
  return { ...Neutrals[scheme], ...surfacesFor(scheme), ...derived, glowA, glowB, glowC, glowD, glowE };
}

export const Colors: { light: Palette; dark: Palette } = {
  light: paletteFor('light'),
  dark: paletteFor('dark'),
};
