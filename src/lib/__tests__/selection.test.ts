import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { pruneIds, toggleId } from '../selection';

describe('toggleId', () => {
  it('adds an id that is not picked and removes one that is', () => {
    assert.deepEqual(toggleId([], 3), [3]);
    assert.deepEqual(toggleId([3], 5), [3, 5]);
    assert.deepEqual(toggleId([3, 5], 3), [5]);
    assert.deepEqual(toggleId([5], 5), []);
  });

  it('leaves the list it was given alone', () => {
    const picked = [1, 2];
    toggleId(picked, 2);
    toggleId(picked, 9);
    assert.deepEqual(picked, [1, 2]);
  });
});

describe('pruneIds', () => {
  it('drops ids that no longer exist and keeps the pick order', () => {
    assert.deepEqual(pruneIds([4, 1, 9, 2], [1, 2, 3, 4]), [4, 1, 2]);
  });

  it('copes with nothing picked or nothing left', () => {
    assert.deepEqual(pruneIds([], [1, 2]), []);
    assert.deepEqual(pruneIds([1, 2], []), []);
  });

  it('accepts any iterable of ids', () => {
    assert.deepEqual(pruneIds([1, 2, 3], new Set([2, 3])), [2, 3]);
  });
});
