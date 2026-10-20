import { Neutrals, surfacesFor } from './neutrals';

/** The app's main color: sky blue. A readable shade for each theme is derived from it. */
export const DEFAULT_ACCENT = '#6FB6FF';

/** Everything in the theme that follows the accent. */
export type AccentSet = {
  accent: string;
  /** Text and icons drawn on the accent. */
  onAccent: string;
  /** The accent at 12% (light) or 24% (dark) over the screen: the selected-tab pill, a selected row. */
  accentSoft: string;
  /** The big number card: the same see-through tint as other cards (#rrggbbaa). */
  heroFrom: string;
  heroTo: string;
  /** Text on the number card: white in dark mode, dark navy in light mode. */
  onHero: string;
  onHeroMuted: string;
  /** The main action button: glass like the rest, with the accent as its label color. */
  primaryFill: string;
  onPrimary: string;
  /** The accent at 12% (light) or 24% (dark) alpha, as #rrggbbaa: the press ripple on a tab. */
  ripple: string;
  /** Soft color glows drawn behind every screen (#rrggbbaa). */
  glows: [string, string, string, string, string];
};

export type AccentColors = { light: AccentSet; dark: AccentSet };

type Rgb = [number, number, number];

export function isHex(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

function toRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/** Hue 0-360, saturation and lightness 0-1. */
export function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = toRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}

export function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return toHex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
}

function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio between two #rrggbb colors. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** A color that may have an alpha (#rrggbbaa), as the plain color it appears as over `backdrop`. */
export function solid(color: string, backdrop: string): string {
  if (color.length !== 9) return color;
  return blend(color.slice(0, 7), backdrop, parseInt(color.slice(7, 9), 16) / 255);
}

/** `color` drawn at `opacity` over `backdrop`. */
export function blend(color: string, backdrop: string, opacity: number): string {
  const [c, b] = [toRgb(color), toRgb(backdrop)];
  return toHex([0, 1, 2].map((i) => c[i] * opacity + b[i] * (1 - opacity)) as Rgb);
}

const STEP = 0.005;

/** Walk the lightness from `start` by `step` until `ok` holds; the extreme end if it never does. */
function search(h: number, s: number, start: number, step: number, ok: (hex: string) => boolean): string {
  let l = start;
  for (;;) {
    const hex = hslToHex(h, s, l);
    if (ok(hex)) return hex;
    const next = l + step;
    if (next < 0 || next > 1) return hex;
    l = next;
  }
}

/**
 * Turn one accent color into everything in the theme that follows it, for light and dark, so text
 * stays readable. The hue and vividness are kept. Dark mode keeps the color as it is (lightened
 * only if it is too dark to read on the screen); light mode darkens it until white text sits on it,
 * because a pale color cannot carry white text. The glow colors, the number card and the main
 * button are see-through tints, each dimmed or lightened until its text reads at 4.5:1 even over
 * the brightest part of the glow. The contrast tests check the same rules.
 */
export function deriveAccent(base: string): AccentColors {
  const [h, s, l] = hexToHsl(isHex(base) ? base : DEFAULT_ACCENT);
  // A fully vivid colour turned darker looks harsh, so the darker shades ease off a little.
  const sDeep = Math.min(s, 0.65);
  const lightS = surfacesFor('light');
  const darkS = surfacesFor('dark');
  // Surfaces can be see-through, so check against what they look like over the screen and each other.
  const resolve = (surfaces: typeof lightS) => {
    const element = solid(surfaces.backgroundElement, surfaces.background);
    return {
      background: surfaces.background,
      backgroundElement: element,
      backgroundSelected: solid(surfaces.backgroundSelected, element),
    };
  };
  const light = { ...Neutrals.light, ...resolve(lightS) };
  const dark = { ...Neutrals.dark, ...resolve(darkS) };

  const darkAccent = search(h, s, l, STEP, (hex) => {
    const soft = blend(hex, dark.background, 0.24);
    const bar = blend(hex, dark.backgroundElement, 0.8);
    return (
      contrastRatio(hex, dark.backgroundSelected) >= 4.5 &&
      contrastRatio('#000000', hex) >= 4.5 &&
      contrastRatio(hex, soft) >= 3 &&
      contrastRatio(bar, dark.backgroundElement) >= 3
    );
  });

  const lightAccent = search(h, sDeep, Math.min(l, 0.6), -STEP, (hex) => {
    const soft = blend(hex, light.background, 0.12);
    const bar = blend(hex, light.backgroundElement, 0.8);
    return (
      contrastRatio(hex, light.backgroundSelected) >= 4.5 &&
      contrastRatio('#ffffff', hex) >= 4.5 &&
      contrastRatio(hex, soft) >= 3 &&
      contrastRatio(bar, light.backgroundElement) >= 3
    );
  });

  /**
   * The five glow colors: the accent's own hue and four neighbours on the colour wheel. Each is
   * dimmed (dark) or lightened (light) until secondary text still reads on it at full strength,
   * with a card and a field laid over it.
   */
  const GLOW_HUES = [0, 55, -70, 130, 25];
  const glows = (
    start: number,
    step: number,
    alpha: string[],
    surfaces: typeof lightS,
    textSecondary: string
  ) =>
    GLOW_HUES.map((shift, i) => {
      const hex = search((h + shift + 360) % 360, Math.min(s, 0.85), start, step, (candidate) => {
        const screen = solid(`${candidate}${alpha[i]}`, surfaces.background);
        const card = solid(surfaces.backgroundElement, screen);
        const field = solid(surfaces.backgroundSelected, card);
        return [screen, card, field].every((surface) => contrastRatio(textSecondary, surface) >= 4.6);
      });
      return `${hex}${alpha[i]}`;
    }) as AccentSet['glows'];
  const darkGlows = glows(0.45, -STEP, ['5C', '4D', '40', '38', '33'], darkS, dark.textSecondary);
  const lightGlows = glows(0.8, STEP, ['99', '85', '70', '66', '5C'], lightS, light.textSecondary);

  /** The accent, nudged until it reads as a label on the glass button over every glow. */
  const labelOnGlass = (
    start: string,
    step: number,
    surfaces: typeof lightS,
    glowColors: string[],
    sat: number
  ) => {
    const screens = [surfaces.background, ...glowColors.map((glow) => solid(glow, surfaces.background))];
    return search(h, sat, hexToHsl(start)[2], step, (hex) =>
      screens.every((screen) => contrastRatio(hex, solid(surfaces.backgroundSelected, screen)) >= 4.5)
    );
  };
  const darkLabel = labelOnGlass(darkAccent, STEP, darkS, darkGlows, s);
  const lightLabel = labelOnGlass(lightAccent, -STEP, lightS, lightGlows, sDeep);

  const DARK_TEXT = { onHero: '#FFFFFF', onHeroMuted: '#E4ECF8' };
  const LIGHT_TEXT = { onHero: '#0B1B33', onHeroMuted: '#33415C' };

  return {
    light: {
      accent: lightAccent,
      onAccent: '#ffffff',
      accentSoft: blend(lightAccent, light.background, 0.12),
      // The number card and the main button are the same glass as every other card; the accent
      // shows in the ring round them and in the button's label, not as a color fill.
      heroFrom: lightS.backgroundElement,
      heroTo: lightS.backgroundElement,
      ...LIGHT_TEXT,
      primaryFill: lightS.backgroundSelected,
      onPrimary: lightLabel,
      ripple: `${lightAccent}1F`,
      glows: lightGlows,
    },
    dark: {
      accent: darkAccent,
      onAccent: '#000000',
      accentSoft: blend(darkAccent, dark.background, 0.24),
      heroFrom: darkS.backgroundElement,
      heroTo: darkS.backgroundElement,
      ...DARK_TEXT,
      primaryFill: darkS.backgroundSelected,
      onPrimary: darkLabel,
      ripple: `${darkAccent}3D`,
      glows: darkGlows,
    },
  };
}
