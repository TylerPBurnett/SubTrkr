import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { resolveRangeSelection } from './selectionRange';

const ORDER = ['a', 'b', 'c', 'd', 'e'];

describe('resolveRangeSelection', () => {
  test('returns the inclusive span between anchor and target', () => {
    assert.deepEqual(resolveRangeSelection(ORDER, 'b', 'd'), ['b', 'c', 'd']);
  });

  test('works when the target precedes the anchor', () => {
    assert.deepEqual(resolveRangeSelection(ORDER, 'd', 'b'), ['b', 'c', 'd']);
  });

  test('returns just the target when there is no anchor', () => {
    assert.deepEqual(resolveRangeSelection(ORDER, null, 'c'), ['c']);
  });

  test('returns just the target when the anchor is no longer visible', () => {
    assert.deepEqual(resolveRangeSelection(ORDER, 'zzz', 'c'), ['c']);
  });

  test('returns just the target when anchor and target match', () => {
    assert.deepEqual(resolveRangeSelection(ORDER, 'c', 'c'), ['c']);
  });

  test('returns an empty span when the target is not visible', () => {
    assert.deepEqual(resolveRangeSelection(ORDER, 'a', 'zzz'), []);
  });
});
