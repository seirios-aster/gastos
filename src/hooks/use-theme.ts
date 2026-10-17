/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { paletteFor, type Palette } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAccent } from '@/lib/accent-preference';

const cache = new Map<string, Palette>();

/** The palette for a theme and accent. Built once per pair, so every component gets the same object. */
export function themeFor(scheme: 'light' | 'dark', accent: string): Palette {
  const key = `${scheme}${accent}`;
  let palette = cache.get(key);
  if (!palette) {
    palette = paletteFor(scheme, accent);
    cache.set(key, palette);
  }
  return palette;
}

export function useTheme() {
  const scheme = useColorScheme();
  const accent = useAccent();
  return themeFor(scheme === 'dark' ? 'dark' : 'light', accent);
}
