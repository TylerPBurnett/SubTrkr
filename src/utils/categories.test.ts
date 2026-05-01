import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { Category } from '@/types';
import {
  UNCATEGORIZED_CATEGORY_COLOR,
  UNCATEGORIZED_CATEGORY_NAME,
  createCategoryLookup,
  resolveCategoryById,
  resolveItemCategoryDisplay,
} from './categories';

const streamingCategory: Category = {
  id: 'cat-streaming',
  name: 'Streaming',
  color: '#22c55e',
  icon: null,
  category_type: 'subscription',
  created_at: '2026-01-01T00:00:00Z',
};

const utilityCategory: Category = {
  id: 'cat-utilities',
  name: 'Utilities',
  color: '#f59e0b',
  icon: null,
  category_type: 'bill',
  created_at: '2026-01-01T00:00:00Z',
};

describe('category helpers', () => {
  test('creates a lookup keyed by category id', () => {
    const categoryLookup = createCategoryLookup([
      streamingCategory,
      utilityCategory,
    ]);

    assert.equal(categoryLookup.get(streamingCategory.id)?.name, 'Streaming');
    assert.equal(categoryLookup.get(utilityCategory.id)?.name, 'Utilities');
  });

  test('resolves the live category from category_id', () => {
    const categoryLookup = createCategoryLookup([streamingCategory]);

    assert.equal(
      resolveCategoryById(streamingCategory.id, categoryLookup)?.color,
      streamingCategory.color,
    );
  });

  test('returns uncategorized defaults when no live category exists', () => {
    const categoryLookup = createCategoryLookup([streamingCategory]);

    const categoryDisplay = resolveItemCategoryDisplay(
      { category_id: 'cat-deleted' },
      categoryLookup,
    );

    assert.deepEqual(categoryDisplay, {
      id: null,
      name: UNCATEGORIZED_CATEGORY_NAME,
      color: UNCATEGORIZED_CATEGORY_COLOR,
      icon: null,
    });
  });
});
