/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/colors';
import { useThemeChoice } from '@/lib/theme-preference';

/** The colors of the look the person picked: Light, Dark (both plain) or Glass. */
export function useTheme() {
  return Colors[useThemeChoice()];
}
