/**
 * The colors that never change with the person's accent choice: text, surfaces, warnings and the
 * text on the big number card. Plain data with no React Native imports (the tests read it too).
 */
/** The three surfaces of the dark theme: the screen, cards and rows, and fields and selected items. */
export type DarkTone = { background: string; backgroundElement: string; backgroundSelected: string };

export const DARK_TONES = {
  /** Deep navy-black, with subtle panels. The default. */
  navy: { background: '#070A12', backgroundElement: '#141A29', backgroundSelected: '#212839' },
  /** Lighter slate-blue panels that stand out more from the screen. */
  slate: { background: '#0A0E18', backgroundElement: '#1C2230', backgroundSelected: '#2B3244' },
} as const satisfies Record<string, DarkTone>;

export type DarkToneName = keyof typeof DARK_TONES;
export const DEFAULT_DARK_TONE: DarkToneName = 'navy';

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
    // The dark surfaces come from a tone (below): a deep navy-black by default.
    ...DARK_TONES.navy,
    textSecondary: '#B0B4BA',
    danger: '#FF6B61',
    warning: '#FFC247',
    onHero: '#ffffff',
    onHeroMuted: '#F0F6FD',
    fieldBorder: '#7A7F87',
  },
} as const;
