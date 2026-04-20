import type { BillingCycle, ItemWithCategory } from '@/types';

export type SortBy =
  | 'next_billing_date'
  | 'name'
  | 'amount'
  | 'category'
  | 'status';
export type SortDirection = 'asc' | 'desc';

export const SORT_OPTIONS: Array<{ value: SortBy; label: string }> = [
  { value: 'next_billing_date', label: 'Next billing' },
  { value: 'name', label: 'Name' },
  { value: 'amount', label: 'Price' },
  { value: 'category', label: 'Category' },
  { value: 'status', label: 'Status' },
];

export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

export const SORT_COLLATOR = new Intl.Collator('en-US', {
  sensitivity: 'base',
  numeric: true,
});

export const STATUS_ORDER: Record<ItemWithCategory['status'], number> = {
  active: 0,
  trial: 1,
  paused: 2,
  cancelled: 3,
  archived: 4,
};

export const STATUS_STYLES: Record<ItemWithCategory['status'], string> = {
  active: '',
  trial: '',
  paused: 'opacity-80',
  cancelled: 'opacity-65',
  archived: 'opacity-55',
};

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}
