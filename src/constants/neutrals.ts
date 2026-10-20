/**
 * The colors that do not follow the accent: text, surfaces, depth and warnings. Plain data with no
 * React Native imports (the tests read it too).
 *
 * The look is glass: cards, rows and fields are see-through tints (a color with 8 digits has an
 * alpha) over a soft glow, edged with a light ring, a rim light, and a shadow for depth.
 */
export type Surfaces = {
  /** The screen. */
  background: string;
  /** Cards and rows. */
  backgroundElement: string;
  /** Fields, tracks and selected items. */
  backgroundSelected: string;
  /** The thin ring round glass. */
  edge: string;
  /** Light catching the top-left rim of a card, and the shade on the opposite rim. */
  rimLight: string;
  rimDark: string;
  /** A faint glow just inside the top of a card. */
  innerGlow: string;
  /** The soft shadow that lifts a card off the screen. */
  shadow: string;
  /** Bars and toasts that float over content: almost solid, so what is under them cannot blur their text. */
  toast: string;
  fieldBorder: string;
};

const DARK_SURFACES: Surfaces = {
  background: '#070A12',
  backgroundElement: '#FFFFFF14',
  backgroundSelected: '#FFFFFF18',
  edge: '#FFFFFF3D',
  rimLight: '#FFFFFF80',
  rimDark: '#00000066',
  innerGlow: '#FFFFFF1A',
  shadow: '#00000073',
  toast: '#10172AF2',
  fieldBorder: '#8C93A3',
};

const LIGHT_SURFACES: Surfaces = {
  background: '#EAF1FB',
  backgroundElement: '#FFFFFFB8',
  backgroundSelected: '#1E3C6E1F',
  edge: '#FFFFFFE6',
  rimLight: '#FFFFFF',
  rimDark: '#1E3C6E24',
  innerGlow: '#FFFFFFB3',
  shadow: '#1E3C6E33',
  toast: '#F6F9FFF2',
  fieldBorder: '#6B7280',
};

export const Neutrals = {
  light: {
    text: '#000000',
    textSecondary: '#60646C',
    danger: '#BE1E16',
    warning: '#855800',
  },
  dark: {
    text: '#ffffff',
    textSecondary: '#B0B4BA',
    danger: '#FF7A70',
    warning: '#FFC247',
  },
} as const;

export function surfacesFor(scheme: 'light' | 'dark'): Surfaces {
  return scheme === 'dark' ? DARK_SURFACES : LIGHT_SURFACES;
}
