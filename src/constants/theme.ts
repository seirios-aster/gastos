/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

import { Colors } from './colors';

export { Colors };

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  /** 12: the gap inside a card and the vertical padding of a field. */
  mid: 12,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Corner radii. Cards, rows and bars, controls (buttons, inputs), and fully round chips. */
export const Radius = { control: 12, row: 16, card: 24, pill: 999 } as const;

/** Smallest comfortable touch targets, in dp. */
export const Touch = { min: 44, button: 48 } as const;

/** Room screens leave at the bottom for the tab bar (its height plus the phone's own bottom edge). */
export const BottomTabInset = 112;
export const MaxContentWidth = 800;
