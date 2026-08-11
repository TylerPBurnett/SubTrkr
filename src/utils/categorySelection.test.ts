import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { Category } from '@/types';
import { UNCATEGORIZED_FILTER_ID } from './categories';
import {
  allCategoriesState,
  describeCategorySelection,
  everySelectableCategoryId,
  isCategorySelected,
  onlyCategory,
  toggleAllCategories,
  toggleCategory,
} from './categorySelection';

function category(id: string, name: string): Category {
  return {
    id,
    name,
    color: '#22c55e',
    icon: null,
    category_type: 'subscription',
    created_at: '2026-01-01T00:00:00Z',
  };
}

const CATEGORIES = [
  category('cat-a', 'Streaming'),
  category('cat-b', 'Software'),
  category('cat-c', 'Fitness'),
];

// cat-a, cat-b, cat-c, __uncategorized__
const EVERY = everySelectableCategoryId(CATEGORIES);

describe('everySelectableCategoryId', () => {
  test('includes uncategorized alongside the real categories', () => {
    assert.deepEqual(EVERY, ['cat-a', 'cat-b', 'cat-c', UNCATEGORIZED_FILTER_ID]);
  });

  test('is uncategorized alone when there are no categories', () => {
    assert.deepEqual(everySelectableCategoryId([]), [UNCATEGORIZED_FILTER_ID]);
  });
});

describe('isCategorySelected', () => {
  test('null selects everything, including ids not in any list', () => {
    assert.equal(isCategorySelected(null, 'cat-a'), true);
    assert.equal(isCategorySelected(null, 'cat-invented-later'), true);
  });

  test('an array selects exactly its members', () => {
    assert.equal(isCategorySelected(['cat-a'], 'cat-a'), true);
    assert.equal(isCategorySelected(['cat-a'], 'cat-b'), false);
  });

  test('the empty selection selects nothing', () => {
    assert.equal(isCategorySelected([], 'cat-a'), false);
  });
});

describe('toggleCategory', () => {
  test('unchecking from unfiltered expands to everything else', () => {
    assert.deepEqual(toggleCategory(null, 'cat-a', EVERY), [
      'cat-b',
      'cat-c',
      UNCATEGORIZED_FILTER_ID,
    ]);
  });

  test('checking the last missing id collapses back to null', () => {
    const partial = ['cat-a', 'cat-b', UNCATEGORIZED_FILTER_ID];
    assert.equal(toggleCategory(partial, 'cat-c', EVERY), null);
  });

  test('toggling the same id twice is a round trip back to unfiltered', () => {
    // The collapse rule is what makes this hold: without it the second toggle
    // would land on a full array, which filters identically today but stops
    // including categories created later.
    const once = toggleCategory(null, 'cat-b', EVERY);
    assert.equal(toggleCategory(once, 'cat-b', EVERY), null);
  });

  test('unchecking every id one at a time reaches the empty selection', () => {
    let selection = toggleCategory(null, EVERY[0], EVERY);
    for (const id of EVERY.slice(1)) {
      selection = toggleCategory(selection, id, EVERY);
    }
    assert.deepEqual(selection, []);
    assert.equal(allCategoriesState(selection, EVERY), 'none');
  });

  test('uncategorized toggles like any other id', () => {
    assert.deepEqual(toggleCategory(null, UNCATEGORIZED_FILTER_ID, EVERY), [
      'cat-a',
      'cat-b',
      'cat-c',
    ]);
  });
});

describe('onlyCategory', () => {
  test('narrows to exactly one id', () => {
    assert.deepEqual(onlyCategory('cat-b', EVERY), ['cat-b']);
  });

  test('collapses to null when that id is the only one there is', () => {
    // Otherwise the filter would report itself as narrowing while showing
    // every item, and the trigger would sit lit for no reason.
    assert.equal(onlyCategory(UNCATEGORIZED_FILTER_ID, [UNCATEGORIZED_FILTER_ID]), null);
  });
});

describe('allCategoriesState', () => {
  test('null is all', () => {
    assert.equal(allCategoriesState(null, EVERY), 'all');
  });

  test('a full array is also all, so the row is not half-lit at rest', () => {
    assert.equal(allCategoriesState([...EVERY], EVERY), 'all');
  });

  test('empty is none', () => {
    assert.equal(allCategoriesState([], EVERY), 'none');
  });

  test('anything between is partial', () => {
    assert.equal(allCategoriesState(['cat-a'], EVERY), 'partial');
    assert.equal(allCategoriesState(['cat-a', 'cat-b', 'cat-c'], EVERY), 'partial');
  });
});

describe('toggleAllCategories', () => {
  test('all clears to none', () => {
    assert.deepEqual(toggleAllCategories(null, EVERY), []);
  });

  test('none fills to all', () => {
    assert.equal(toggleAllCategories([], EVERY), null);
  });

  test('partial fills to all rather than clearing', () => {
    // One click should undo a narrowing; reaching "none" is a deliberate
    // second press, not something you land on by trying to reset.
    assert.equal(toggleAllCategories(['cat-a'], EVERY), null);
  });

  test('pressing twice from unfiltered returns to unfiltered', () => {
    assert.equal(toggleAllCategories(toggleAllCategories(null, EVERY), EVERY), null);
  });
});

describe('describeCategorySelection', () => {
  test('says nothing when nothing is narrowed', () => {
    assert.equal(describeCategorySelection(null, EVERY), null);
    assert.equal(describeCategorySelection([...EVERY], EVERY), null);
  });

  test('names the zero case as a state, not a count', () => {
    // "0 of 4 categories" reads as a broken counter.
    assert.equal(describeCategorySelection([], EVERY), 'no categories');
  });

  test('drops the total when exactly one is selected', () => {
    assert.equal(describeCategorySelection(['cat-a'], EVERY), '1 category');
  });

  test('counts against every selectable id, uncategorized included', () => {
    assert.equal(describeCategorySelection(['cat-a', 'cat-b'], EVERY), '2 of 4 categories');
  });
});
