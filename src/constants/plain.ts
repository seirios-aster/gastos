/**
 * The plain look: solid cards on a flat screen, with sky blue as the one accent. This is the
 * app's look from before glass, kept for people who prefer it. Plain data with no React Native
 * imports (the tests read it too).
 */
import { blend, contrastRatio, hexToHsl, search, STEP } from './accent';

/** The accent of the plain look. */
export const PLAIN_ACCENT = '#6FB6FF';

const LIGHT = {
  text: '#000000',
  textSecondary: '#60646C',
  danger: '#BE1E16',
  warning: '#855800',
  background: '#FFFFFF',
  backgroundElement: '#F0F0F3',
  backgroundSelected: '#E0E1E6',
  fieldBorder: '#7A7F88',
  onHero: '#FFFFFF',
  onHeroMuted: '#F0F6FD',
};

const DARK = {
  text: '#FFFFFF',
  textSecondary: '#B0B4BA',
  danger: '#FF6B61',
  warning: '#FFC247',
  background: '#070A12',
  backgroundElement: '#141A29',
  backgroundSelected: '#212839',
  fieldBorder: '#7A7F87',
  onHero: '#FFFFFF',
  onHeroMuted: '#F0F6FD',
};

/** Nothing glassy: no rings, rims, glows or shadows. */
const CLEAR = '#00000000';

/** Sky blue, made readable for each theme: darker in light mode (white text must sit on it), kept in dark mode. */
function derive() {
  const [h, s, l] = hexToHsl(PLAIN_ACCENT);
  const sDeep = Math.min(s, 0.65);

  const darkAccent = search(h, s, l, STEP, (hex) => {
    const soft = blend(hex, DARK.background, 0.24);
    const bar = blend(hex, DARK.backgroundElement, 0.8);
    return (
      contrastRatio(hex, DARK.backgroundSelected) >= 4.5 &&
      contrastRatio('#000000', hex) >= 4.5 &&
      contrastRatio(hex, soft) >= 3 &&
      contrastRatio(bar, DARK.backgroundElement) >= 3
    );
  });
  const lightAccent = search(h, sDeep, Math.min(l, 0.6), -STEP, (hex) => {
    const soft = blend(hex, LIGHT.background, 0.12);
    const bar = blend(hex, LIGHT.backgroundElement, 0.8);
    return (
      contrastRatio(hex, LIGHT.backgroundSelected) >= 4.5 &&
      contrastRatio('#ffffff', hex) >= 4.5 &&
      contrastRatio(hex, soft) >= 3 &&
      contrastRatio(bar, LIGHT.backgroundElement) >= 3
    );
  });

  // The number card's gradient: white text and the pale muted tone must read on both ends.
  const readsOnHero = (hex: string) =>
    contrastRatio(LIGHT.onHero, hex) >= 4.5 && contrastRatio(LIGHT.onHeroMuted, hex) >= 4.5;
  const heroFrom = search(h, sDeep, hexToHsl(lightAccent)[2], -STEP, readsOnHero);
  const heroTo = search(h, sDeep, Math.max(hexToHsl(heroFrom)[2] - 0.1, 0.1), -STEP, readsOnHero);

  return { darkAccent, lightAccent, heroFrom, heroTo };
}

const derived = derive();

function build(scheme: 'light' | 'dark') {
  const base = scheme === 'dark' ? DARK : LIGHT;
  const accent = scheme === 'dark' ? derived.darkAccent : derived.lightAccent;
  const onAccent = scheme === 'dark' ? '#000000' : '#FFFFFF';
  return {
    ...base,
    edge: CLEAR,
    rimLight: CLEAR,
    rimDark: CLEAR,
    innerGlow: CLEAR,
    shadow: CLEAR,
    toast: base.backgroundElement,
    field: base.backgroundElement,
    fieldInset: CLEAR,
    accent,
    onAccent,
    accentSoft: blend(accent, base.background, scheme === 'dark' ? 0.24 : 0.12),
    heroFrom: derived.heroFrom,
    heroTo: derived.heroTo,
    primaryFill: accent,
    onPrimary: onAccent,
    ripple: `${accent}${scheme === 'dark' ? '3D' : '1F'}`,
    glowA: CLEAR,
    glowB: CLEAR,
    glowC: CLEAR,
    glowD: CLEAR,
    glowE: CLEAR,
  };
}

export const PLAIN = { light: build('light'), dark: build('dark') };
