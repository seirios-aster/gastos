import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DEFAULT_ACCENT, blend, contrastRatio, deriveAccent, hexToHsl, hslToHex, isHex, solid } from '../../constants/accent';
import { paletteFor as rawPalette } from '../../constants/colors';

/** A spread of picks: every 20 degrees of hue, grey to vivid, near-black to near-white. */
const PICKS: string[] = [DEFAULT_ACCENT, '#000000', '#ffffff', '#808080', '#FFFF00', '#00FFFF'];
for (let h = 0; h < 360; h += 20) {
  for (const s of [0.15, 0.6, 1]) {
    for (const l of [0.08, 0.3, 0.5, 0.7, 0.92]) PICKS.push(hslToHex(h, s, l));
  }
}

/** The palette with see-through surfaces replaced by the colors they appear as over the screen. */
function paletteFor(scheme: 'light' | 'dark', accent: string) {
  const c = rawPalette(scheme, accent);
  const element = solid(c.backgroundElement, c.background);
  return {
    ...c,
    backgroundElement: element,
    backgroundSelected: solid(c.backgroundSelected, element),
    // The see-through number card, as it looks over the plain screen (the glow is tested below).
    heroFrom: solid(c.heroFrom, c.background),
    heroTo: solid(c.heroTo, c.background),
  };
}

describe('colour helpers', () => {
  it('round-trips hex through hsl', () => {
    for (const hex of ['#B196FF', '#0A6BD6', '#FF0000', '#123456']) {
      const [h, s, l] = hexToHsl(hex);
      const back = hslToHex(h, s, l);
      for (let i = 1; i < 7; i += 2) {
        assert.ok(Math.abs(parseInt(hex.slice(i, i + 2), 16) - parseInt(back.slice(i, i + 2), 16)) <= 1);
      }
    }
  });

  it('knows a hex colour when it sees one', () => {
    assert.ok(isHex('#b196ff'));
    assert.ok(!isHex('b196ff') && !isHex('#fff') && !isHex(null));
  });

  it('keeps the default as it is in dark mode', () => {
    assert.equal(deriveAccent(DEFAULT_ACCENT).dark.accent, DEFAULT_ACCENT);
  });

  it('darkens the default in light mode so white text reads on it', () => {
    const light = deriveAccent(DEFAULT_ACCENT).light;
    assert.notEqual(light.accent, DEFAULT_ACCENT);
    assert.ok(contrastRatio('#ffffff', light.accent) >= 4.5);
  });

  it('keeps the hue of what was picked', () => {
    const [h] = hexToHsl('#FF5A5A');
    const set = deriveAccent('#FF5A5A');
    for (const scheme of ['light', 'dark'] as const) {
      const diff = Math.abs(hexToHsl(set[scheme].accent)[0] - h);
      assert.ok(Math.min(diff, 360 - diff) < 6, `${scheme} hue moved by ${diff}`);
    }
  });
});

describe('any chosen colour stays readable', () => {
  for (const scheme of ['light', 'dark'] as const) {
    it(`${scheme}: every pair passes the same checks as the default palette`, () => {
      for (const pick of PICKS) {
        const c = paletteFor(scheme, pick);
        const surfaces = [c.background, c.backgroundElement, c.backgroundSelected];
        const label = `${scheme} ${pick} -> ${c.accent}`;

        for (const surface of [c.background, c.backgroundElement]) {
          assert.ok(contrastRatio(c.accent, surface) >= 4.5, `${label}: accent text on ${surface}`);
        }
        for (const surface of surfaces) assert.ok(contrastRatio(c.accent, surface) >= 3, `${label}: graphic`);
        assert.ok(contrastRatio(c.onAccent, c.accent) >= 4.5, `${label}: onAccent`);
        assert.ok(contrastRatio(c.accent, c.accentSoft) >= 3, `${label}: accent on its pill`);
        assert.ok(contrastRatio(c.text, c.accentSoft) >= 7, `${label}: text on its pill`);
        for (const end of [c.heroFrom, c.heroTo]) {
          assert.ok(contrastRatio(c.onHero, end) >= 4.5, `${label}: onHero on ${end}`);
          assert.ok(contrastRatio(c.onHeroMuted, end) >= 4.5, `${label}: onHeroMuted on ${end}`);
        }
        const bar = blend(c.accent, c.backgroundElement, 0.8);
        assert.ok(contrastRatio(bar, c.backgroundElement) >= 3, `${label}: chart bars`);
      }
    });
  }
});

describe('the glass surfaces', () => {
  for (const scheme of ['light', 'dark'] as const) {
    it(`${scheme}: text, secondary text, danger and warning read on every surface`, () => {
      const c = paletteFor(scheme, DEFAULT_ACCENT);
      for (const surface of [c.background, c.backgroundElement, c.backgroundSelected]) {
        for (const name of ['text', 'textSecondary', 'danger', 'warning'] as const) {
          assert.ok(contrastRatio(c[name], surface) >= 4.5, `${scheme}: ${name} on ${surface}`);
        }
        assert.ok(contrastRatio(c.fieldBorder, surface) >= 3, `${scheme}: field border on ${surface}`);
      }
    });
  }
});

describe('the glow', () => {
  it('keeps text readable even at the brightest point of any glow', () => {
    for (const scheme of ['dark', 'light'] as const) {
      for (const pick of PICKS) {
        const c = rawPalette(scheme, pick);
        for (const glow of [c.glowA, c.glowB, c.glowC, c.glowD, c.glowE]) {
          // The glow at full strength over the screen, then the card and a field over that.
          const screen = solid(glow, c.background);
          const card = solid(c.backgroundElement, screen);
          const field = solid(c.backgroundSelected, card);
          for (const surface of [screen, card, field]) {
            for (const name of ['text', 'textSecondary'] as const) {
              assert.ok(
                contrastRatio(c[name], surface) >= 4.5,
                `${scheme} ${pick}: ${name} on ${surface} (glow ${glow})`
              );
            }
          }
          // The main button and the number card are tints over the screen, glow included.
          const button = solid(c.primaryFill, screen);
          assert.ok(
            contrastRatio(c.onPrimary, button) >= 4.5,
            `${scheme} ${pick}: onPrimary on the button ${button} (glow ${glow})`
          );
          for (const end of [c.heroFrom, c.heroTo]) {
            const hero = solid(end, screen);
            for (const name of ['onHero', 'onHeroMuted'] as const) {
              assert.ok(
                contrastRatio(c[name], hero) >= 4.5,
                `${scheme} ${pick}: ${name} on the number card ${hero} (glow ${glow})`
              );
            }
          }
        }
      }
    }
  });
});
