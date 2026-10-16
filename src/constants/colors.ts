/**
 * The app's colors, light and dark. Plain data with no React Native imports, so the unit tests can
 * check the contrast of every pair (src/lib/__tests__/contrast.test.ts). Import them from
 * '@/constants/theme', which re-exports them.
 */
export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    accent: '#0A6BD6',
    onAccent: '#ffffff',
    danger: '#BE1E16',
    warning: '#855800',
    // The accent at 12% over the background: the selected-tab pill in the tab bar.
    accentSoft: '#E2EDFA',
    // The big number card (Today, History, Recurring): the same deep blue in both themes, white text.
    heroFrom: '#0A6BD6',
    heroTo: '#0852AC',
    onHero: '#ffffff',
    onHeroMuted: '#F0F6FD',
    // The edge of a text input: 3:1 against every surface (WCAG 1.4.11).
    fieldBorder: '#7A7F88',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    accent: '#4DA3FF',
    onAccent: '#000000',
    danger: '#FF6B61',
    warning: '#FFC247',
    // The accent at 24% over the background.
    accentSoft: '#12273D',
    heroFrom: '#0A6BD6',
    heroTo: '#0852AC',
    onHero: '#ffffff',
    onHeroMuted: '#F0F6FD',
    fieldBorder: '#7A7F87',
  },
} as const;
