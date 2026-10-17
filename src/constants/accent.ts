import { Neutrals } from './neutrals';

/** The main color people start with. Sky blue; the app derives a readable shade for each theme from it. */
export const DEFAULT_ACCENT = '#6FB6FF';

/** Everything in the theme that follows the accent. */
export type AccentSet = {
  accent: string;
  /** Text and icons drawn on the accent. */
  onAccent: string;
  /** The accent at 12% (light) or 24% (dark) over the screen: the selected-tab pill, a selected row. */
  accentSoft: string;
  /** The big number card is a gradient between these, the same in both themes. */
  heroFrom: string;
  heroTo: string;
  /** The accent at 12% (light) or 24% (dark) alpha, as #rrggbbaa: the press ripple on a tab. */
  ripple: string;
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
 * Turn the one color a person picked into a full set for each theme that stays readable. The hue
 * and vividness are kept. Dark mode keeps the color as it is (lightened only if it is too dark to
 * read on black); light mode darkens it until white text sits on it comfortably, because a pale
 * color cannot carry white text. The same rules the contrast tests check are applied here.
 */
export function deriveAccent(base: string): AccentColors {
  const [h, s, l] = hexToHsl(isHex(base) ? base : DEFAULT_ACCENT);
  // A fully vivid colour turned darker looks harsh, so the darker shades ease off a little.
  const sDeep = Math.min(s, 0.65);
  const light = Neutrals.light;
  const dark = Neutrals.dark;

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

  // The card text is white and a pale off-white; both must read on both ends of the gradient.
  const readsOnHero = (hex: string) =>
    contrastRatio(light.onHero, hex) >= 4.5 && contrastRatio(light.onHeroMuted, hex) >= 4.5;
  const heroFrom = search(h, sDeep, hexToHsl(lightAccent)[2], -STEP, readsOnHero);
  const heroTo = search(h, sDeep, Math.max(hexToHsl(heroFrom)[2] - 0.1, 0.1), -STEP, readsOnHero);

  const set = (accent: string, onAccent: string, mix: number, alpha: string, bg: string): AccentSet => ({
    accent,
    onAccent,
    accentSoft: blend(accent, bg, mix),
    heroFrom,
    heroTo,
    ripple: `${accent}${alpha}`,
  });

  return {
    light: set(lightAccent, '#ffffff', 0.12, '1F', light.background),
    dark: set(darkAccent, '#000000', 0.24, '3D', dark.background),
  };
}
