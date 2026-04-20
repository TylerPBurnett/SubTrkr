import type {
  Category,
  ItemType,
  ItemWithCategory,
  SpendingByCategory,
} from '@/types';
import { getDaysUntil, isDueWithinDays } from '../../utils/dates';
import { toMonthlyAmount, toYearlyAmount } from './billingMath';

export function calculateMonthlySavings(
  items: ItemWithCategory[],
  type?: ItemType,
): number {
  const filtered = items.filter(
    (item) =>
      (item.status === 'cancelled' || item.status === 'archived') &&
      (!type || item.item_type === type),
  );

  return filtered.reduce((total, item) => {
    return total + toMonthlyAmount(item.amount, item.billing_cycle);
  }, 0);
}

export function calculateMonthlySpending(
  items: ItemWithCategory[],
  type?: ItemType,
): number {
  const filtered = items.filter(
    (item) => item.status === 'active' && (!type || item.item_type === type),
  );

  return filtered.reduce((total, item) => {
    return total + toMonthlyAmount(item.amount, item.billing_cycle);
  }, 0);
}

export function calculateYearlySpending(
  items: ItemWithCategory[],
  type?: ItemType,
): number {
  const filtered = items.filter(
    (item) => item.status === 'active' && (!type || item.item_type === type),
  );

  return filtered.reduce((total, item) => {
    return total + toYearlyAmount(item.amount, item.billing_cycle);
  }, 0);
}

export function getSpendingByCategory(
  items: ItemWithCategory[],
  categories: Category[],
  type?: ItemType,
): SpendingByCategory[] {
  const filteredCategories = type
    ? categories.filter((category) => category.category_type === type)
    : categories;
  const categoryMap = new Map<string, SpendingByCategory>();

  filteredCategories.forEach((category) => {
    categoryMap.set(category.id, {
      category,
      total: 0,
      count: 0,
    });
  });

  items.forEach((item) => {
    if (item.status !== 'active') {
      return;
    }
    if (type && item.item_type !== type) {
      return;
    }
    if (!item.category_id) {
      return;
    }

    const spending = categoryMap.get(item.category_id);
    if (!spending) {
      return;
    }

    spending.total += toMonthlyAmount(item.amount, item.billing_cycle);
    spending.count += 1;
  });

  return Array.from(categoryMap.values())
    .filter((spending) => spending.count > 0)
    .sort((left, right) => right.total - left.total);
}

export function getUpcomingItems(
  items: ItemWithCategory[],
  days = 7,
  type?: ItemType,
): ItemWithCategory[] {
  const filtered = items.filter((item) => {
    const isActiveAndDueSoon =
      item.status === 'active' && isDueWithinDays(item.next_billing_date, days);

    return (!type || item.item_type === type) && isActiveAndDueSoon;
  });

  return filtered.sort((left, right) => {
    return getDaysUntil(left.next_billing_date) - getDaysUntil(right.next_billing_date);
  });
}
