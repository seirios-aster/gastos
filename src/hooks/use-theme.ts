/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { paletteFor, type Palette } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { DarkToneName } from '@/constants/neutrals';
import { useAccent } from '@/lib/accent-preference';
import { useDarkTone } from '@/lib/dark-tone-preference';

const cache = new Map<string, Palette>();

/** The palette for a theme and accent. Built once per pair, so every component gets the same object. */
export function themeFor(scheme: 'light' | 'dark', accent: string, tone: DarkToneName): Palette {
  const key = `${scheme}${accent}${tone}`;
  let palette = cache.get(key);
  if (!palette) {
    palette = paletteFor(scheme, accent, tone);
    cache.set(key, palette);
  }
  return palette;
}

export function useTheme() {
  const scheme = useColorScheme();
  const accent = useAccent();
  const tone = useDarkTone();
  return themeFor(scheme === 'dark' ? 'dark' : 'light', accent, tone);
}
