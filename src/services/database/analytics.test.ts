import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { addDays } from 'date-fns';
import type { Category, ItemWithCategory } from '@/types';
import { formatISODate, getToday } from '@/utils/dates';
import {
  calculateMonthlySavings,
  calculateMonthlySpending,
  calculateYearlySpending,
  getSpendingByCategory,
  getUpcomingItems,
} from './analytics';

const subscriptionCategory: Category = {
  id: 'cat-streaming',
  name: 'Streaming',
  color: '#22c55e',
  icon: null,
  category_type: 'subscription',
  created_at: '2026-01-01T00:00:00Z',
};

const billCategory: Category = {
  id: 'cat-utilities',
  name: 'Utilities',
  color: '#f59e0b',
  icon: null,
  category_type: 'bill',
  created_at: '2026-01-01T00:00:00Z',
};

function buildItem(overrides: Partial<ItemWithCategory> = {}): ItemWithCategory {
  return {
    id: 'item-1',
    name: 'Example',
    amount: 10,
    currency: 'USD',
    billing_cycle: 'monthly',
    category_id: subscriptionCategory.id,
    next_billing_date: formatISODate(addDays(getToday(), 2)),
    start_date: '2026-01-01',
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
    category: subscriptionCategory,
    ...overrides,
  };
}

describe('analytics helpers', () => {
  test('calculates monthly and yearly spend from active items only', () => {
    const items = [
      buildItem({ amount: 12, billing_cycle: 'monthly' }),
      buildItem({
        id: 'item-yearly',
        amount: 120,
        billing_cycle: 'yearly',
      }),
      buildItem({
        id: 'item-paused',
        amount: 40,
        status: 'paused',
      }),
    ];

    assert.equal(calculateMonthlySpending(items), 22);
    assert.equal(calculateYearlySpending(items), 264);
  });

  test('groups monthly spend by category and respects type filters', () => {
    const items = [
      buildItem({ amount: 12 }),
      buildItem({
        id: 'item-bill',
        amount: 60,
        item_type: 'bill',
        category_id: billCategory.id,
        category: billCategory,
      }),
      buildItem({
        id: 'item-bill-quarterly',
        amount: 90,
        billing_cycle: 'quarterly',
        item_type: 'bill',
        category_id: billCategory.id,
        category: billCategory,
      }),
    ];

    const spending = getSpendingByCategory(items, [subscriptionCategory, billCategory], 'bill');

    assert.equal(spending.length, 1);
    assert.equal(spending[0].category.id, billCategory.id);
    assert.equal(spending[0].count, 2);
    assert.equal(spending[0].total, 90);
  });

  test('calculates monthly savings from cancelled and archived items', () => {
    const items = [
      buildItem({ status: 'cancelled', amount: 120, billing_cycle: 'yearly' }),
      buildItem({ id: 'item-archived', status: 'archived', amount: 15 }),
      buildItem({ id: 'item-active', status: 'active', amount: 99 }),
    ];

    assert.equal(calculateMonthlySavings(items), 25);
  });

  test('returns upcoming active items in chronological order', () => {
    const items = [
      buildItem({
        id: 'item-later',
        next_billing_date: formatISODate(addDays(getToday(), 5)),
      }),
      buildItem({
        id: 'item-soon',
        next_billing_date: formatISODate(addDays(getToday(), 1)),
      }),
      buildItem({
        id: 'item-paused',
        status: 'paused',
        next_billing_date: formatISODate(addDays(getToday(), 1)),
      }),
    ];

    const upcoming = getUpcomingItems(items, 7);

    assert.deepEqual(
      upcoming.map((item) => item.id),
      ['item-soon', 'item-later'],
    );
  });
});
