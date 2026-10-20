/**
 * The app's colors, light and dark. Plain data with no React Native imports, so the unit tests can
 * check the contrast of every pair (src/lib/__tests__/contrast.test.ts). Import them from
 * '@/constants/theme', which re-exports them. These are the defaults; the accent-colored parts
 * follow the person's choice at runtime (see useTheme).
 */
import { DEFAULT_ACCENT, deriveAccent, type AccentSet } from './accent';
import { DARK_TONES, DEFAULT_DARK_TONE, Neutrals, type DarkToneName } from './neutrals';

export type Palette = { [K in keyof (typeof Neutrals)['light']]: string } & AccentSet;

/** The full palette for one theme with this accent (any #rrggbb). */
export function paletteFor(
  scheme: 'light' | 'dark',
  accent: string,
  tone: DarkToneName = DEFAULT_DARK_TONE
): Palette {
  const surfaces = scheme === 'dark' ? DARK_TONES[tone] : {};
  return { ...Neutrals[scheme], ...surfaces, ...deriveAccent(accent, tone)[scheme] };
}

export const Colors: { light: Palette; dark: Palette } = {
  light: paletteFor('light', DEFAULT_ACCENT),
  dark: paletteFor('dark', DEFAULT_ACCENT),
};
