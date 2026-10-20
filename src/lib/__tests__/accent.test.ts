import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DEFAULT_ACCENT, blend, contrastRatio, deriveAccent, hexToHsl, hslToHex, isHex, solid } from '../../constants/accent';
import { paletteFor as rawPalette } from '../../constants/colors';
import { DARK_TONES, type DarkToneName } from '../../constants/neutrals';

/** A spread of picks: every 20 degrees of hue, grey to vivid, near-black to near-white. */
const PICKS: string[] = [DEFAULT_ACCENT, '#000000', '#ffffff', '#808080', '#FFFF00', '#00FFFF'];
for (let h = 0; h < 360; h += 20) {
  for (const s of [0.15, 0.6, 1]) {
    for (const l of [0.08, 0.3, 0.5, 0.7, 0.92]) PICKS.push(hslToHex(h, s, l));
  }
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

/** The palette with see-through surfaces replaced by the colors they appear as over the screen. */
function paletteFor(scheme: 'light' | 'dark', accent: string, tone: DarkToneName = 'glass') {
  const c = rawPalette(scheme, accent, tone);
  const element = solid(c.backgroundElement, c.background);
  return { ...c, backgroundElement: element, backgroundSelected: solid(c.backgroundSelected, element) };
}

const CASES: ['light' | 'dark', DarkToneName][] = [
  ['light', 'navy'],
  ['light', 'glass'],
  ...(Object.keys(DARK_TONES) as DarkToneName[]).map((tone): ['dark', DarkToneName] => ['dark', tone]),
];

describe('any chosen colour stays readable', () => {
  for (const [scheme, tone] of CASES) {
    it(`${scheme === 'dark' ? `dark (${tone})` : 'light'}: every pair passes the same checks as the default palette`, () => {
      for (const pick of PICKS) {
        const c = paletteFor(scheme, pick, tone);
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

describe('dark tones', () => {
  for (const tone of Object.keys(DARK_TONES) as DarkToneName[]) {
    it(`${tone}: text, secondary text, danger and warning read on every surface`, () => {
      const c = paletteFor('dark', DEFAULT_ACCENT, tone);
      for (const surface of [c.background, c.backgroundElement, c.backgroundSelected]) {
        for (const name of ['text', 'textSecondary', 'danger', 'warning'] as const) {
          assert.ok(contrastRatio(c[name], surface) >= 4.5, `${tone}: ${name} on ${surface}`);
        }
        assert.ok(contrastRatio(c.fieldBorder, surface) >= 3, `${tone}: field border on ${surface}`);
      }
    });
  }
});

describe('glass glow', () => {
  it('keeps text readable even at the brightest point of a glow', () => {
    for (const [scheme, tone] of [['dark', 'glass'], ['light', 'glass']] as const) {
      for (const pick of PICKS) {
        const c = rawPalette(scheme, pick, tone);
        for (const glow of [c.glowA, c.glowB, c.glowC]) {
          // The glow at full strength over the screen, then the card over that.
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
        }
      }
    }
  });

  it('has no glow or ring on the solid looks', () => {
    const c = rawPalette('dark', DEFAULT_ACCENT, 'navy');
    assert.deepEqual([c.glowA, c.glowB, c.glowC, c.edge], ['#00000000', '#00000000', '#00000000', '#00000000']);
  });
});
