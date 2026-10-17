/**
 * The colors that never change with the person's accent choice: text, surfaces, warnings and the
 * text on the big number card. Plain data with no React Native imports (the tests read it too).
 */
export const Neutrals = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    danger: '#BE1E16',
    warning: '#855800',
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
    danger: '#FF6B61',
    warning: '#FFC247',
    onHero: '#ffffff',
    onHeroMuted: '#F0F6FD',
    fieldBorder: '#7A7F87',
  },
} as const;
