import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DEFAULT_THEME, isThemeChoice, nativeScheme, resolveSavedChoice } from '../theme-choice';

describe('theme choice', () => {
  it('starts in Glass on a fresh install', () => {
    assert.equal(DEFAULT_THEME, 'glass');
    assert.equal(resolveSavedChoice(null, null), 'glass');
  });

  it('keeps a saved choice of any of the three', () => {
    for (const choice of ['light', 'dark', 'glass'] as const) {
      assert.equal(resolveSavedChoice(choice, 'light'), choice);
    }
  });

  it('carries the old setting over: old dark was the glass look, old light becomes plain Light', () => {
    assert.equal(resolveSavedChoice(null, 'dark'), 'glass');
    assert.equal(resolveSavedChoice(null, 'light'), 'light');
  });

  it('ignores junk', () => {
    assert.equal(resolveSavedChoice('purple', 42), 'glass');
    assert.equal(isThemeChoice('sepia'), false);
  });

  it('tells the phone dark for Dark and Glass, light for Light', () => {
    assert.equal(nativeScheme('light'), 'light');
    assert.equal(nativeScheme('dark'), 'dark');
    assert.equal(nativeScheme('glass'), 'dark');
  });
});
