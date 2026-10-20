import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DEFAULT_DIM, MAX_DIM, MIN_DIM, clampDim } from '../background-limits';

describe('clampDim', () => {
  it('keeps a value inside the allowed range', () => {
    assert.equal(clampDim(0.7), 0.7);
    assert.equal(clampDim(0), MIN_DIM);
    assert.equal(clampDim(1), MAX_DIM);
    assert.equal(clampDim(-3), MIN_DIM);
  });

  it('falls back to the default for nonsense', () => {
    assert.equal(clampDim(Number.NaN), DEFAULT_DIM);
    assert.equal(clampDim(Number.POSITIVE_INFINITY), DEFAULT_DIM);
  });

  it('never allows less dimming than the safe minimum', () => {
    assert.ok(MIN_DIM >= 0.4);
    assert.ok(DEFAULT_DIM > MIN_DIM && DEFAULT_DIM < MAX_DIM);
  });
});
