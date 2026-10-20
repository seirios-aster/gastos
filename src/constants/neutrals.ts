/**
 * The colors that never change with the person's accent choice: text, surfaces, warnings and the
 * text on the big number card. Plain data with no React Native imports (the tests read it too).
 */
/**
 * The surfaces of a theme: the screen, cards and rows, fields and selected items, plus the thin
 * ring drawn round cards (transparent unless the look is glass). A color with 8 digits has an alpha:
 * cards and fields can be see-through, so the glow behind the screen shows a little.
 */
export type Surfaces = {
  background: string;
  backgroundElement: string;
  backgroundSelected: string;
  edge: string;
  fieldBorder?: string;
};

/** Looks that use see-through surfaces over a glow. */
export const GLASS_TONES = ['glass', 'sheet'] as const;

const NO_EDGE = '#00000000';

export const DARK_TONES = {
  /** Frosted-glass look: see-through cards over a soft glow, on a deep navy-black. The default. */
  glass: {
    background: '#070A12',
    backgroundElement: '#FFFFFF14',
    backgroundSelected: '#FFFFFF18',
    edge: '#FFFFFF33',
    fieldBorder: '#8C93A3',
  },
  /** The same glass on a lighter slate-blue screen, with brighter panels (the add-expense sheet's colors). */
  sheet: {
    background: '#0A0E18',
    backgroundElement: '#FFFFFF1C',
    backgroundSelected: '#FFFFFF14',
    edge: '#FFFFFF3D',
    fieldBorder: '#8C93A3',
  },
  /** Deep navy-black, with solid subtle panels, no glass. */
  navy: { background: '#070A12', backgroundElement: '#141A29', backgroundSelected: '#212839', edge: NO_EDGE },
} as const satisfies Record<string, Surfaces>;

/** The light theme's glass look: a pale blue screen with white, see-through cards. */
export const LIGHT_GLASS: Surfaces = {
  background: '#EAF1FB',
  backgroundElement: '#FFFFFFB8',
  backgroundSelected: '#1E3C6E1F',
  edge: '#FFFFFFE6',
  fieldBorder: '#6B7280',
};

export function isGlass(tone: DarkToneName): boolean {
  return (GLASS_TONES as readonly string[]).includes(tone);
}

export type DarkToneName = keyof typeof DARK_TONES;
export const DEFAULT_DARK_TONE: DarkToneName = 'glass';

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
    // The surfaces (background, cards, fields) come from a tone; these are the navy ones.
    background: DARK_TONES.navy.background,
    backgroundElement: DARK_TONES.navy.backgroundElement,
    backgroundSelected: DARK_TONES.navy.backgroundSelected,
    textSecondary: '#B0B4BA',
    danger: '#FF7A70',
    warning: '#FFC247',
    onHero: '#ffffff',
    onHeroMuted: '#F0F6FD',
    fieldBorder: '#7A7F87',
  },
} as const;

/** The surfaces for a theme and tone (the tone only matters for the dark theme, and for glass in light). */
export function surfacesFor(scheme: 'light' | 'dark', tone: DarkToneName): Surfaces {
  if (scheme === 'dark') return DARK_TONES[tone];
  if (isGlass(tone)) return LIGHT_GLASS;
  const { background, backgroundElement, backgroundSelected } = Neutrals.light;
  return { background, backgroundElement, backgroundSelected, edge: NO_EDGE };
}
