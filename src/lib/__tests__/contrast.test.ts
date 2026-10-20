import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { solid } from '../../constants/accent';
import { Colors as Palettes } from '../../constants/colors';

/** The palette with see-through surfaces replaced by the colors they appear as over the screen. */
function resolved(scheme: 'light' | 'dark') {
  const c = Palettes[scheme];
  const element = solid(c.backgroundElement, c.background);
  return { ...c, backgroundElement: element, backgroundSelected: solid(c.backgroundSelected, element) };
}
const Colors = { light: resolved('light'), dark: resolved('dark') };

/** WCAG 2.x contrast ratio between two #rrggbb colors. */
function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance([r, g, b]: [number, number, number]): number {
  const [lr, lg, lb] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function ratio(a: [number, number, number], b: [number, number, number]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const contrast = (a: string, b: string) => ratio(rgb(a), rgb(b));

/** `color` drawn at `opacity` over `backdrop`, as the rgb it ends up as. */
function over(color: string, backdrop: string, opacity: number): [number, number, number] {
  const [c, b] = [rgb(color), rgb(backdrop)];
  return [0, 1, 2].map((i) => Math.round(c[i] * opacity + b[i] * (1 - opacity))) as [
    number,
    number,
    number,
  ];
}

for (const scheme of ['light', 'dark'] as const) {
  const c = Colors[scheme];
  const surfaces = [c.background, c.backgroundElement, c.backgroundSelected];

  describe(`${scheme} theme contrast`, () => {
    it('keeps body and secondary text at 4.5:1 or better on every surface', () => {
      for (const surface of surfaces) {
        for (const name of ['text', 'textSecondary', 'danger', 'warning'] as const) {
          const value = contrast(c[name], surface);
          assert.ok(value >= 4.5, `${name} on ${surface} is ${value.toFixed(2)}`);
        }
      }
    });

    it('keeps accent text (links, the due-soon label) at 4.5:1 on the screen and on cards', () => {
      for (const surface of [c.background, c.backgroundElement]) {
        const value = contrast(c.accent, surface);
        assert.ok(value >= 4.5, `accent on ${surface} is ${value.toFixed(2)}`);
      }
    });

    it('keeps accent usable as a graphic (3:1) on every surface', () => {
      for (const surface of surfaces) assert.ok(contrast(c.accent, surface) >= 3);
    });

    it('reads onAccent on accent at 4.5:1', () => {
      assert.ok(contrast(c.onAccent, c.accent) >= 4.5);
    });

    it('keeps the selected-tab icon (accent) at 3:1 on its pill, and text readable on it', () => {
      assert.ok(contrast(c.accent, c.accentSoft) >= 3);
      assert.ok(contrast(c.text, c.accentSoft) >= 7);
    });

    it('reads the hero text on the whole gradient: white at 4.5:1 and the muted tone too', () => {
      for (const end of [c.heroFrom, c.heroTo]) {
        assert.ok(contrast(c.onHero, end) >= 4.5, `onHero on ${end}`);
        assert.ok(contrast(c.onHeroMuted, end) >= 4.5, `onHeroMuted on ${end}`);
      }
    });

    it('draws the input edge at 3:1 on every surface', () => {
      for (const surface of surfaces) {
        const value = contrast(c.fieldBorder, surface);
        assert.ok(value >= 3, `fieldBorder on ${surface} is ${value.toFixed(2)}`);
      }
    });

    it('draws chart bars (accent at 80%) at 3:1 against the card', () => {
      const bar = over(c.accent, c.backgroundElement, 0.8);
      assert.ok(ratio(bar, rgb(c.backgroundElement)) >= 3);
    });
  });
}
