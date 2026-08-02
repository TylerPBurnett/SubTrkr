import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  OTHER_CATEGORY_COLOR,
  OTHER_CATEGORY_ID,
  foldCategoryTail,
  type CategorySlice,
} from './categoryFolding';

function slice(id: string, value: number, share: number): CategorySlice {
  return { color: '#22c55e', id, name: `Category ${id}`, share, value };
}

// Descending by value, as getSpendingByCategory already returns.
const eight: CategorySlice[] = [
  slice('a', 48, 0.31),
  slice('b', 32, 0.2),
  slice('c', 25, 0.16),
  slice('d', 18, 0.11),
  slice('e', 12, 0.08),
  slice('f', 9, 0.06),
  slice('g', 8, 0.05),
  slice('h', 5, 0.03),
];

describe('foldCategoryTail', () => {
  test('returns empty input untouched', () => {
    assert.deepEqual(foldCategoryTail([]), { visible: [], otherCount: 0 });
  });

  test('does not fold when below the limit', () => {
    const input = eight.slice(0, 3);
    const result = foldCategoryTail(input);

    assert.equal(result.otherCount, 0);
    assert.deepEqual(result.visible, input);
  });

  test('does not fold when exactly at the limit', () => {
    const input = eight.slice(0, 5);
    const result = foldCategoryTail(input);

    assert.equal(result.otherCount, 0);
    assert.equal(result.visible.length, 5);
  });

  test('does not fold a tail of one', () => {
    const input = eight.slice(0, 6);
    const result = foldCategoryTail(input);

    assert.equal(result.otherCount, 0);
    assert.equal(result.visible.length, 6);
    assert.equal(result.visible[result.visible.length - 1]?.id, 'f');
  });

  test('folds a tail of two or more', () => {
    const result = foldCategoryTail(eight);

    assert.equal(result.otherCount, 3);
    assert.equal(result.visible.length, 6);
  });

  test('sums value and share into the Other slice', () => {
    const folded = foldCategoryTail(eight).visible;
    const other = folded[folded.length - 1];

    assert.equal(other?.id, OTHER_CATEGORY_ID);
    assert.equal(other?.color, OTHER_CATEGORY_COLOR);
    assert.equal(other?.name, 'Other');
    assert.equal(other?.value, 22);
    assert.ok(Math.abs((other?.share ?? 0) - 0.14) < 1e-9);
  });

  test('preserves head order ahead of the Other slice', () => {
    const ids = foldCategoryTail(eight).visible.map((item) => item.id);

    assert.deepEqual(ids, ['a', 'b', 'c', 'd', 'e', OTHER_CATEGORY_ID]);
  });

  test('honors a custom limit', () => {
    const result = foldCategoryTail(eight, 2);

    assert.equal(result.otherCount, 6);
    assert.deepEqual(result.visible.map((item) => item.id), [
      'a',
      'b',
      OTHER_CATEGORY_ID,
    ]);
  });
});
