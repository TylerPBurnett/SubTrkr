import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  OTHER_CATEGORY_COLOR,
  OTHER_CATEGORY_ID,
  UNCATEGORIZED_SLICE_ID,
  buildCategorySlices,
  foldCategoryTail,
  type CategorySlice,
  type CategoryTotal,
} from './categoryFolding';

function categoryTotal(id: string, total: number): CategoryTotal {
  return { category: { color: '#22c55e', id, name: `Category ${id}` }, total };
}

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

describe('buildCategorySlices', () => {
  test('arcs sum to the overall total when everything is categorized', () => {
    const slices = buildCategorySlices(
      [categoryTotal('a', 60), categoryTotal('b', 40)],
      100,
    );

    assert.equal(slices.length, 2);
    assert.equal(slices.reduce((sum, s) => sum + s.value, 0), 100);
    assert.ok(!slices.some((s) => s.id === UNCATEGORIZED_SLICE_ID));
  });

  test('surfaces the uncategorized remainder as its own slice', () => {
    // The reported bug: $40 of active spend belonged to no category, so the
    // donut centre read $100 while the arcs summed to $60.
    const slices = buildCategorySlices([categoryTotal('a', 60)], 100);

    const uncategorized = slices.find((s) => s.id === UNCATEGORIZED_SLICE_ID);
    assert.equal(uncategorized?.value, 40);
    assert.equal(uncategorized?.name, 'Uncategorized');
    assert.equal(slices.reduce((sum, s) => sum + s.value, 0), 100);
  });

  test('computes shares against the overall total, not the categorized subtotal', () => {
    // Previously this category rendered as 100% because its share was measured
    // against the categorized subtotal it alone made up.
    const slices = buildCategorySlices([categoryTotal('a', 60)], 100);
    const categoryA = slices.find((s) => s.id === 'a');

    assert.ok(Math.abs((categoryA?.share ?? 0) - 0.6) < 1e-9);
    assert.ok(Math.abs(slices.reduce((sum, s) => sum + s.share, 0) - 1) < 1e-9);
  });

  test('ranks uncategorized by value like any other slice', () => {
    const slices = buildCategorySlices(
      [categoryTotal('a', 30), categoryTotal('b', 10)],
      100,
    );

    // Uncategorized is 60 here, so it outranks both real categories.
    assert.deepEqual(slices.map((s) => s.id), [UNCATEGORIZED_SLICE_ID, 'a', 'b']);
  });

  test('ignores sub-cent float remainders', () => {
    // 33.33 * 3 = 99.99; a 0.002 gap is float noise from the monthly
    // normalisation, not a real uncategorized item.
    const slices = buildCategorySlices(
      [categoryTotal('a', 33.33), categoryTotal('b', 33.33), categoryTotal('c', 33.33)],
      99.992,
    );

    assert.ok(!slices.some((s) => s.id === UNCATEGORIZED_SLICE_ID));
  });

  test('never emits a negative uncategorized slice', () => {
    // Defensive: if the categorized subtotal somehow exceeds the overall total,
    // an "Uncategorized -$5" arc would be nonsense.
    const slices = buildCategorySlices([categoryTotal('a', 105)], 100);

    assert.ok(!slices.some((s) => s.id === UNCATEGORIZED_SLICE_ID));
    assert.equal(slices.length, 1);
  });

  test('handles an empty distribution', () => {
    assert.deepEqual(buildCategorySlices([], 0), []);
  });
});

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
