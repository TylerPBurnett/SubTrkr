import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SearchFilterToolbar from './SearchFilterToolbar';

const markup = (searchQuery = '') =>
  renderToStaticMarkup(
    createElement(SearchFilterToolbar, {
      searchQuery,
      onSearchChange: () => undefined,
      searchPlaceholder: 'Search subscriptions...',
      categories: [],
      selectedCategoryIds: null,
      onCategoryIdsChange: () => undefined,
      showActives: true,
      onShowActivesChange: () => undefined,
      showTrials: true,
      onShowTrialsChange: () => undefined,
      showPaused: true,
      onShowPausedChange: () => undefined,
      showCancelled: false,
      onShowCancelledChange: () => undefined,
      activeFilterCount: 0,
      onClearFilters: () => undefined,
      filterLabel: 'subscriptions',
      viewMode: 'list',
      onViewModeChange: () => undefined,
      sortBy: 'name',
      onSortByChange: () => undefined,
      sortDirection: 'asc',
      onSortDirectionChange: () => undefined,
      sortOptions: [{ value: 'name', label: 'Name' }],
    }),
  );

function attribute(html: string, tagPattern: RegExp, name: string): string {
  const tag = html.match(tagPattern)?.[0];
  assert.ok(tag, `expected a tag matching ${tagPattern}`);
  const quoted = tag.match(new RegExp(`${name}="([^"]*)"`));
  return quoted?.[1] ?? '';
}

describe('SearchFilterToolbar', () => {
  test('the search field is named, labelled, and not autocompleted', () => {
    const html = markup();
    const inputClass = attribute(html, /<input\b[^>]*>/, 'class');
    assert.match(html, /name="item-search"/);
    assert.match(html, /aria-label="Search subscriptions"/);
    assert.match(html, /autoComplete="off"|autocomplete="off"/);
    assert.match(inputClass, /\bmin-w-0\b/);
    assert.match(inputClass, /\bflex-1\b/);
  });

  test('fixed controls refuse to shrink so the input yields first', () => {
    const empty = markup();
    const filled = markup('netflix');

    assert.match(empty, /search-shell[^"]*min-w-\[min\(100%,20rem\)\]/);

    const filterClass = attribute(
      empty,
      /<button[^>]*aria-label="Filter subscriptions"[^>]*>/,
      'class',
    );
    const sortClass = attribute(
      empty,
      /<button[^>]*aria-label="Sort items"[^>]*>/,
      'class',
    );
    const gridClass = attribute(
      empty,
      /<button[^>]*aria-label="Grid view"[^>]*>/,
      'class',
    );
    const listClass = attribute(
      empty,
      /<button[^>]*aria-label="List view"[^>]*>/,
      'class',
    );
    const viewGroupClass = attribute(
      empty,
      /<div class="relative flex shrink-0[^"]*"/,
      'class',
    );
    const clearClass = attribute(
      filled,
      /<button[^>]*aria-label="Clear search"[^>]*>/,
      'class',
    );

    assert.match(filterClass, /\bshrink-0\b/);
    assert.match(sortClass, /\bshrink-0\b/);
    assert.match(gridClass, /./);
    assert.match(listClass, /./);
    assert.match(viewGroupClass, /\bshrink-0\b/);
    assert.match(clearClass, /\bshrink-0\b/);
  });

  test('the clear control is a labelled button', () => {
    const html = markup('netflix');
    assert.match(html, /aria-label="Clear search"/);
    assert.match(
      attribute(html, /<button[^>]*aria-label="Clear search"[^>]*>/, 'type'),
      /^button$/,
    );
  });
});
