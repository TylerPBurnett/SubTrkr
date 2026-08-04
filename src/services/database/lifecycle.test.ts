import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { Item } from '@/types';
import {
  buildExecuteStatusChangeRpcParams,
  calculateNextBillingDate,
  getBatchMinimumEffectiveDate,
  getTargetStatus,
} from './lifecycleHelpers';

function buildItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
    name: 'Example',
    amount: 25,
    currency: 'USD',
    billing_cycle: 'monthly',
    category_id: null,
    next_billing_date: '2026-04-10',
    start_date: '2025-01-10',
    notes: null,
    url: null,
    logo_url: null,
    is_active: true,
    status: 'active',
    paused_at: null,
    paused_until: null,
    cancelled_at: null,
    cancellation_date: null,
    archived_at: null,
    trial_started_at: null,
    trial_end_date: null,
    reminder_days: 3,
    item_type: 'subscription',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('lifecycle helpers', () => {
  test('maps status transitions correctly', () => {
    assert.equal(getTargetStatus('archive', 'cancelled'), 'archived');
    assert.equal(getTargetStatus('resume', 'paused'), 'active');
    assert.equal(getTargetStatus('start_trial', 'active'), 'trial');
  });

  test('builds resume RPC params with a re-anchored billing date', () => {
    const item = buildItem({
      status: 'paused',
      next_billing_date: '2026-01-10',
      paused_at: '2026-03-01T12:00:00Z',
    });

    const params = buildExecuteStatusChangeRpcParams(
      item,
      {
        action: 'resume',
        resumedOn: '2026-04-15',
        reason: 'Back again',
      },
      '2026-04-09',
    );

    assert.equal(params.p_action, 'resume');
    assert.equal(params.p_effective_date, '2026-04-15');
    assert.equal(params.p_next_billing_date, '2026-05-10');
    assert.equal(params.p_minimum_effective_date, '2026-03-01');
    assert.deepEqual(
      params.p_clear_fields,
      [
        'paused_at',
        'paused_until',
        'cancelled_at',
        'cancellation_date',
        'archived_at',
        'trial_started_at',
        'trial_end_date',
      ],
    );
  });

  test('keeps an already-future billing date when resuming', () => {
    const item = buildItem({
      status: 'paused',
      next_billing_date: '2026-06-10',
    });

    const params = buildExecuteStatusChangeRpcParams(
      item,
      {
        action: 'resume',
        resumedOn: '2026-04-15',
      },
      '2026-04-09',
    );

    assert.equal(params.p_next_billing_date, '2026-06-10');
  });

  test('rejects converting a zero-dollar trial to paid', () => {
    const item = buildItem({
      amount: 0,
      status: 'trial',
      trial_started_at: '2026-04-01T00:00:00Z',
    });

    assert.throws(() => {
      buildExecuteStatusChangeRpcParams(
        item,
        {
          action: 'convert',
          convertedOn: '2026-04-15',
        },
        '2026-04-09',
      );
    }, /Set an amount greater than 0/);
  });

  test('advances billing dates by cycle', () => {
    assert.equal(calculateNextBillingDate('2026-02-15', 'monthly'), '2026-03-15');
    assert.equal(calculateNextBillingDate('2026-02-15', 'quarterly'), '2026-05-15');
    assert.equal(calculateNextBillingDate('2026-02-15', 'yearly'), '2027-02-15');
  });
});

describe('getBatchMinimumEffectiveDate', () => {
  test('returns the latest floor across the batch', () => {
    const items = [
      buildItem({ id: 'a', start_date: '2025-01-10' }),
      buildItem({ id: 'b', start_date: '2025-06-01' }),
      buildItem({ id: 'c', start_date: '2024-03-20' }),
    ];

    assert.equal(getBatchMinimumEffectiveDate(items, 'cancel'), '2025-06-01');
  });

  test('returns the later floor for a two-item batch', () => {
    const items = [
      buildItem({ id: 'a', start_date: '2025-01-10' }),
      buildItem({ id: 'b', start_date: '2025-02-10' }),
    ];

    assert.equal(getBatchMinimumEffectiveDate(items, 'cancel'), '2025-02-10');
  });

  test('returns null when no item in the batch has a floor', () => {
    const items = [
      buildItem({ id: 'a', start_date: '2025-01-10' }),
      buildItem({ id: 'b', start_date: '2025-06-01' }),
    ];

    assert.equal(getBatchMinimumEffectiveDate(items, 'pause'), null);
  });

  test('returns null for an empty batch', () => {
    assert.equal(getBatchMinimumEffectiveDate([], 'cancel'), null);
  });

  test('accounts for paused_at when resuming', () => {
    const items = [
      buildItem({
        id: 'a',
        status: 'paused',
        start_date: '2025-01-10',
        paused_at: '2026-03-01T12:00:00Z',
      }),
      buildItem({
        id: 'b',
        status: 'paused',
        start_date: '2025-01-10',
        paused_at: '2026-05-04T12:00:00Z',
      }),
    ];

    assert.equal(getBatchMinimumEffectiveDate(items, 'resume'), '2026-05-04');
  });
});
