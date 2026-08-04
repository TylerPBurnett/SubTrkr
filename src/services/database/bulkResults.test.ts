import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { emptyBulkResult, summarizeBulkResult } from './bulkResults';

const DELETE_COPY = {
  pastTense: 'Deleted',
  failedVerb: 'delete',
  singular: 'subscription',
  plural: 'subscriptions',
};

describe('summarizeBulkResult', () => {
  test('reports a clean success with the plural noun', () => {
    const summary = summarizeBulkResult(
      { succeeded: ['a', 'b', 'c'], failed: [], skipped: [] },
      DELETE_COPY,
    );

    assert.equal(summary!.message, 'Deleted 3 subscriptions');
    assert.equal(summary!.tone, 'success');
  });

  test('uses the singular noun for one item', () => {
    const summary = summarizeBulkResult(
      { succeeded: ['a'], failed: [], skipped: [] },
      DELETE_COPY,
    );

    assert.equal(summary!.message, 'Deleted 1 subscription');
    assert.equal(summary!.tone, 'success');
  });

  test('reports partial success as an error', () => {
    const summary = summarizeBulkResult(
      {
        succeeded: ['a', 'b'],
        failed: [{ id: 'c', error: 'boom' }],
        skipped: [],
      },
      DELETE_COPY,
    );

    assert.equal(summary!.message, 'Deleted 2 — 1 failed');
    assert.equal(summary!.tone, 'error');
  });

  test('reports total failure without a count', () => {
    const summary = summarizeBulkResult(
      {
        succeeded: [],
        failed: [{ id: 'a', error: 'boom' }, { id: 'b', error: 'boom' }],
        skipped: [],
      },
      DELETE_COPY,
    );

    assert.equal(summary!.message, "Couldn't delete. Please try again.");
    assert.equal(summary!.tone, 'error');
  });

  test('appends skipped items to the message', () => {
    const summary = summarizeBulkResult(
      { succeeded: ['a', 'b'], failed: [], skipped: ['c'] },
      DELETE_COPY,
    );

    assert.equal(summary!.message, 'Deleted 2 subscriptions · 1 skipped');
    assert.equal(summary!.tone, 'success');
  });

  test('returns a null summary when nothing was attempted', () => {
    assert.equal(summarizeBulkResult(emptyBulkResult(), DELETE_COPY), null);
  });

  test('reports an all-skipped batch as nothing to do', () => {
    const summary = summarizeBulkResult(
      { succeeded: [], failed: [], skipped: ['a', 'b', 'c'] },
      DELETE_COPY,
    );

    assert.equal(summary!.message, 'Nothing to do — 3 skipped');
    assert.equal(summary!.tone, 'success');
  });
});
