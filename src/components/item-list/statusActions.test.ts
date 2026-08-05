import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { ItemStatus } from '@/types';
import {
  BULK_ACTIONS,
  isActionEligible,
  partitionByEligibility,
  STATUS_ACTION_SOURCES,
} from './statusActions';

describe('statusActions', () => {
  test('maps every action to its legal source statuses', () => {
    assert.deepEqual(STATUS_ACTION_SOURCES.pause, ['active']);
    assert.deepEqual(STATUS_ACTION_SOURCES.resume, ['paused']);
    assert.deepEqual(STATUS_ACTION_SOURCES.cancel, ['active', 'paused', 'trial']);
    assert.deepEqual(STATUS_ACTION_SOURCES.reactivate, ['cancelled', 'archived']);
    assert.deepEqual(STATUS_ACTION_SOURCES.archive, ['cancelled']);
    assert.deepEqual(STATUS_ACTION_SOURCES.convert, ['trial']);
    assert.deepEqual(STATUS_ACTION_SOURCES.start_trial, ['active']);
    assert.deepEqual(STATUS_ACTION_SOURCES.edit_cancellation, ['cancelled']);
  });

  test('excludes per-item-judgement actions from the bulk set', () => {
    assert.deepEqual(BULK_ACTIONS, [
      'pause',
      'resume',
      'cancel',
      'reactivate',
      'archive',
    ]);
  });

  test('answers eligibility per status', () => {
    assert.equal(isActionEligible('active', 'pause'), true);
    assert.equal(isActionEligible('paused', 'pause'), false);
    assert.equal(isActionEligible('trial', 'cancel'), true);
    assert.equal(isActionEligible('archived', 'reactivate'), true);
    assert.equal(isActionEligible('active', 'archive'), false);
  });

  test('partitions a mixed selection into eligible and skipped', () => {
    const items: { id: string; status: ItemStatus }[] = [
      { id: 'a', status: 'active' },
      { id: 'b', status: 'active' },
      { id: 'c', status: 'paused' },
    ];

    const { eligible, skipped } = partitionByEligibility(items, 'pause');

    assert.deepEqual(eligible.map((item) => item.id), ['a', 'b']);
    assert.deepEqual(skipped.map((item) => item.id), ['c']);
  });

  test('partitions everything as eligible when all statuses qualify', () => {
    const items: { id: string; status: ItemStatus }[] = [
      { id: 'a', status: 'active' },
      { id: 'b', status: 'paused' },
      { id: 'c', status: 'trial' },
    ];

    const { eligible, skipped } = partitionByEligibility(items, 'cancel');

    assert.equal(eligible.length, 3);
    assert.equal(skipped.length, 0);
  });
});
