import { supabase } from './supabase';
import type {
  Category,
  Item,
  Payment,
  ItemWithCategory,
  SpendingByCategory,
  BillingCycle,
  ItemType,
  ItemStatus,
  StatusHistory,
  StatusChangeData,
} from '@/types';
import {
  formatISODate,
  getToday,
  getDaysUntil,
  isDueWithinDays,
  calculateNextBillingDate as calcNextBillingDate,
  getNextBillingDateOnOrAfter,
  getNextFutureBillingDate,
} from '../utils/dates';

// Helper to get current user ID
async function getUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

function assertValidAmountForStatus(amount: number, status: ItemStatus): void {
  if (!Number.isFinite(amount)) {
    throw new Error('Amount must be a valid number');
  }

  if (amount < 0) {
    throw new Error('Amount cannot be negative');
  }

  if (status !== 'trial' && amount === 0) {
    throw new Error('Amount must be greater than 0 for paid items');
  }
}

// ============ Categories ============

export async function getCategories(type?: ItemType): Promise<Category[]> {
  const userId = await getUserId();
  let query = supabase.from('categories').select('*').eq('user_id', userId).order('name');
  if (type) {
    query = query.eq('category_type', type);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createCategory(
  name: string,
  color: string,
  categoryType: ItemType,
  icon?: string
): Promise<Category> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('categories')
    .insert({
      user_id: userId,
      name,
      color,
      category_type: categoryType,
      icon: icon || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategory(
  id: string,
  name: string,
  color: string,
  icon?: string
): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase
    .from('categories')
    .update({ name, color, icon: icon || null })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function deleteCategory(id: string): Promise<void> {
  const userId = await getUserId();
  // Orphan items first
  const { error: updateError } = await supabase
    .from('items')
    .update({ category_id: null })
    .eq('category_id', id)
    .eq('user_id', userId);
  if (updateError) throw updateError;

  const { error } = await supabase.from('categories').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

// ============ Items ============

export async function getItems(type?: ItemType): Promise<ItemWithCategory[]> {
  const userId = await getUserId();
  let query = supabase
    .from('items')
    .select('*, category:categories(*)')
    .eq('user_id', userId)
    .order('next_billing_date', { ascending: true });
  if (type) {
    query = query.eq('item_type', type);
  }
  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row: any) => ({
    ...row,
    category: row.category || undefined,
  }));
}

export async function getActiveItems(type?: ItemType): Promise<ItemWithCategory[]> {
  const items = await getItems(type);
  return items.filter((s) => s.status === 'active');
}

export async function getItemById(
  id: string,
  userId?: string
): Promise<ItemWithCategory | null> {
  const resolvedUserId = userId ?? (await getUserId());
  const { data, error } = await supabase
    .from('items')
    .select('*, category:categories(*)')
    .eq('id', id)
    .eq('user_id', resolvedUserId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw error;
  }
  return { ...data, category: data.category || undefined };
}

export async function createItem(data: {
  name: string;
  amount: number;
  currency: string;
  billing_cycle: BillingCycle;
  item_type: ItemType;
  category_id?: string;
  next_billing_date: string;
  start_date: string;
  notes?: string;
  url?: string;
  logo_url?: string;
  reminder_days?: number;
  status?: ItemStatus;
  trial_end_date?: string;
}): Promise<Item> {
  const userId = await getUserId();
  const initialStatus = data.status || 'active';
  assertValidAmountForStatus(data.amount, initialStatus);

  const insertData: any = {
    user_id: userId,
    name: data.name,
    amount: data.amount,
    currency: data.currency,
    billing_cycle: data.billing_cycle,
    item_type: data.item_type,
    category_id: data.category_id || null,
    next_billing_date: data.next_billing_date,
    start_date: data.start_date,
    notes: data.notes || null,
    url: data.url || null,
    logo_url: data.logo_url || null,
    reminder_days: data.reminder_days ?? 3,
    status: initialStatus,
  };

  // Set trial-specific fields if status is trial
  if (initialStatus === 'trial') {
    insertData.trial_started_at = new Date().toISOString();
    insertData.trial_end_date = data.trial_end_date || null;
  }

  const { data: item, error } = await supabase
    .from('items')
    .insert(insertData)
    .select()
    .single();
  if (error) throw error;
  return item;
}

export async function updateItem(
  id: string,
  data: Partial<Omit<Item, 'id' | 'created_at' | 'updated_at'>>
): Promise<void> {
  const userId = await getUserId();

  if ('amount' in data && data.amount !== undefined) {
    const { data: statusRow, error: statusError } = await supabase
      .from('items')
      .select('status')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (statusError) {
      if (statusError.code === 'PGRST116') throw new Error('Item not found');
      throw statusError;
    }

    assertValidAmountForStatus(data.amount, statusRow.status as ItemStatus);
  }

  // Filter out undefined/non-present fields
  const updateData: Record<string, unknown> = {};
  const fields = [
    'name',
    'amount',
    'currency',
    'billing_cycle',
    'item_type',
    'category_id',
    'next_billing_date',
    'start_date',
    'notes',
    'url',
    'logo_url',
    'is_active',
    'reminder_days',
    'trial_end_date',
  ] as const;
  for (const field of fields) {
    if (field in data) {
      updateData[field] = data[field as keyof typeof data];
    }
  }
  if (Object.keys(updateData).length === 0) return;

  const { error } = await supabase
    .from('items')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function deleteItem(id: string): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase.from('items').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export async function toggleItemActive(id: string): Promise<void> {
  // DEPRECATED: Use executeStatusChange instead
  const userId = await getUserId();
  const item = await getItemById(id, userId);
  if (!item) return;

  const isResuming = !item.is_active;
  if (isResuming) {
    const newNextDate = getNextFutureBillingDate(item.next_billing_date, item.billing_cycle);
    const { error } = await supabase
      .from('items')
      .update({ is_active: true, next_billing_date: newNextDate })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('items')
      .update({ is_active: false })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
  }
}

// ============ Status Management ============

type TransactionalStatusAction =
  | Exclude<StatusChangeData['action'], 'convert'>
  | 'convert_trial'
  | 'trial_expired';

interface ExecuteItemStatusChangeRpcParams {
  p_item_id: string;
  p_action: TransactionalStatusAction;
  p_effective_date: string | null;
  p_pause_until: string | null;
  p_trial_end_date: string | null;
  p_next_billing_date: string | null;
  p_clear_fields: string[];
  p_reason: string | null;
  p_notes: string | null;
  p_today: string;
  p_minimum_effective_date: string | null;
}

const ACTIVE_STATUS_CLEAR_FIELDS = [
  'paused_at',
  'paused_until',
  'cancelled_at',
  'cancellation_date',
  'archived_at',
  'trial_started_at',
  'trial_end_date',
] as const;

function getTargetStatus(action: StatusChangeData['action'], currentStatus: ItemStatus): ItemStatus {
  const transitions: Record<string, ItemStatus> = {
    'active-pause': 'paused',
    'active-cancel': 'cancelled',
    'active-start_trial': 'trial',
    'paused-resume': 'active',
    'paused-cancel': 'cancelled',
    'cancelled-edit_cancellation': 'cancelled',
    'cancelled-reactivate': 'active',
    'cancelled-archive': 'archived',
    'archived-reactivate': 'active',
    'trial-convert': 'active',
    'trial-cancel': 'cancelled',
  };

  const key = `${currentStatus}-${action}`;
  const newStatus = transitions[key];

  if (!newStatus) {
    throw new Error(`Invalid status transition: ${currentStatus} -> ${action}`);
  }

  return newStatus;
}

function getCanonicalStatusChangeAction(action: StatusChangeData['action']): TransactionalStatusAction {
  return action === 'convert' ? 'convert_trial' : action;
}

function resolveStatusChangeEffectiveDate(data: StatusChangeData, fallbackDate: string): string {
  switch (data.action) {
    case 'pause':
      return fallbackDate;
    case 'cancel':
    case 'edit_cancellation':
      return data.cancelledOn || fallbackDate;
    case 'resume':
    case 'reactivate':
      return data.resumedOn || fallbackDate;
    case 'convert':
      return data.convertedOn || fallbackDate;
    case 'archive':
    case 'start_trial':
      return fallbackDate;
  }
}

function getNextBillingDateAfterResume(item: Item, resumedOn: string): string {
  if (item.next_billing_date >= resumedOn) {
    return item.next_billing_date;
  }

  const anchorDate = item.start_date || item.next_billing_date || resumedOn;
  return getNextBillingDateOnOrAfter(anchorDate, item.billing_cycle, resumedOn);
}

function normalizeDateOnly(value: string | null | undefined): string | null {
  return value ? value.split('T')[0] : null;
}

function latestDate(...dates: Array<string | null | undefined>): string | null {
  const validDates = dates.filter((date): date is string => Boolean(date));
  if (validDates.length === 0) {
    return null;
  }

  validDates.sort();
  return validDates[validDates.length - 1];
}

function getMinimumEffectiveDate(item: Item, action: StatusChangeData['action']): string | null {
  const startDate = normalizeDateOnly(item.start_date);

  switch (action) {
    case 'cancel':
    case 'edit_cancellation':
      return startDate;
    case 'resume':
      return latestDate(startDate, normalizeDateOnly(item.paused_at)) ?? startDate;
    case 'reactivate':
      return latestDate(
        startDate,
        item.cancellation_date,
        normalizeDateOnly(item.cancelled_at),
        normalizeDateOnly(item.archived_at)
      ) ?? startDate;
    case 'convert':
      return latestDate(startDate, normalizeDateOnly(item.trial_started_at)) ?? startDate;
    case 'pause':
    case 'archive':
    case 'start_trial':
      return null;
  }
}

async function executeStatusChangeRpc(params: ExecuteItemStatusChangeRpcParams): Promise<void> {
  const { error } = await supabase.rpc('execute_item_status_change', params);
  if (error) throw error;
}

export async function executeStatusChange(
  itemId: string,
  data: StatusChangeData
): Promise<void> {
  const userId = await getUserId();
  const item = await getItemById(itemId, userId);
  if (!item) throw new Error('Item not found');

  const newStatus = getTargetStatus(data.action, item.status);
  const today = formatISODate(getToday());
  const action = getCanonicalStatusChangeAction(data.action);
  const effectiveDate = resolveStatusChangeEffectiveDate(data, today);
  const minimumEffectiveDate = getMinimumEffectiveDate(item, data.action);
  let pauseUntil: string | null = null;
  let trialEndDate: string | null = null;
  let nextBillingDate: string | null = null;
  let clearFields: string[] = [];

  switch (newStatus) {
    case 'trial':
      trialEndDate = data.trialEndDate || null;
      break;

    case 'paused':
      pauseUntil = data.pauseUntil || null;
      break;

    case 'cancelled':
      break;

    case 'archived':
      break;

    case 'active':
      if (data.action === 'convert' && item.amount === 0) {
        throw new Error('Set an amount greater than 0 before converting this trial to paid');
      }

      clearFields = [...ACTIVE_STATUS_CLEAR_FIELDS];

      // Calculate next billing date
      if (data.convertedOn) {
        nextBillingDate = getNextFutureBillingDate(
          data.convertedOn,
          item.billing_cycle
        );
      } else if (data.resumedOn) {
        nextBillingDate = data.action === 'resume'
          ? getNextBillingDateAfterResume(item, data.resumedOn)
          : getNextFutureBillingDate(data.resumedOn, item.billing_cycle);
      } else {
        nextBillingDate = getNextFutureBillingDate(
          item.next_billing_date,
          item.billing_cycle
        );
      }
      break;
  }

  await executeStatusChangeRpc({
    p_item_id: itemId,
    p_action: action,
    p_effective_date: effectiveDate,
    p_pause_until: pauseUntil,
    p_trial_end_date: trialEndDate,
    p_next_billing_date: nextBillingDate,
    p_clear_fields: clearFields,
    p_reason: data.reason?.trim() || null,
    p_notes: data.notes?.trim() || null,
    p_today: today,
    p_minimum_effective_date: minimumEffectiveDate,
  });
}

export function calculateMonthlySavings(items: ItemWithCategory[], type?: ItemType): number {
  const filtered = items.filter(
    (item) =>
      (item.status === 'cancelled' || item.status === 'archived') &&
      (!type || item.item_type === type)
  );

  return filtered.reduce((total, item) => {
    let monthlyAmount = item.amount;

    switch (item.billing_cycle) {
      case 'weekly':
        monthlyAmount = (item.amount * 52) / 12;
        break;
      case 'monthly':
        monthlyAmount = item.amount;
        break;
      case 'quarterly':
        monthlyAmount = item.amount / 3;
        break;
      case 'yearly':
        monthlyAmount = item.amount / 12;
        break;
    }

    return total + monthlyAmount;
  }, 0);
}

export async function archivePastCancellations(): Promise<number> {
  return 0;
}

export async function resumePausedItems(): Promise<number> {
  const todayStr = formatISODate(getToday());
  const userId = await getUserId();

  // Find paused items where paused_until <= today
  const { data: itemsToResume, error: fetchError } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'paused')
    .not('paused_until', 'is', null)
    .lte('paused_until', todayStr);

  if (fetchError) throw fetchError;
  if (!itemsToResume || itemsToResume.length === 0) return 0;

  const results = await Promise.allSettled(
    itemsToResume.map(item =>
      executeStatusChange(item.id, {
        action: 'resume',
        resumedOn: item.paused_until || todayStr,
        reason: 'Auto-resumed',
      })
    )
  );

  const failures = results.filter(r => r.status === 'rejected');
  if (failures.length > 0) {
    console.error(`Failed to resume ${failures.length} items:`, failures);
  }

  return results.filter(r => r.status === 'fulfilled').length;
}

export async function getStatusHistory(itemId: string): Promise<StatusHistory[]> {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('item_status_history')
    .select('*')
    .eq('item_id', itemId)
    .eq('user_id', userId)
    .order('changed_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getStatusHistoryForItems(itemIds: string[]): Promise<StatusHistory[]> {
  const uniqueItemIds = Array.from(new Set(itemIds.filter(Boolean)));
  if (uniqueItemIds.length === 0) return [];

  const userId = await getUserId();

  const { data, error } = await supabase
    .from('item_status_history')
    .select('*')
    .eq('user_id', userId)
    .in('item_id', uniqueItemIds)
    .order('changed_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ============ Payments ============

export async function getPayments(itemId?: string): Promise<Payment[]> {
  const userId = await getUserId();
  let query = supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .order('paid_at', { ascending: false });
  if (itemId) {
    query = query.eq('item_id', itemId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function recordPayment(
  itemId: string,
  amount: number,
  paidAt: string
): Promise<Payment> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('payments')
    .insert({ user_id: userId, item_id: itemId, amount, paid_at: paidAt })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============ Analytics (pure calculations - unchanged except is_active checks) ============

export function calculateMonthlySpending(items: ItemWithCategory[], type?: ItemType): number {
  const filtered = items.filter(
    (item) =>
      item.status === 'active' &&
      (!type || item.item_type === type)
  );

  return filtered.reduce((total, item) => {
    let monthlyAmount = item.amount;

    switch (item.billing_cycle) {
      case 'weekly':
        monthlyAmount = (item.amount * 52) / 12;
        break;
      case 'monthly':
        monthlyAmount = item.amount;
        break;
      case 'quarterly':
        monthlyAmount = item.amount / 3;
        break;
      case 'yearly':
        monthlyAmount = item.amount / 12;
        break;
    }

    return total + monthlyAmount;
  }, 0);
}

export function calculateYearlySpending(items: ItemWithCategory[], type?: ItemType): number {
  const filtered = items.filter(
    (item) =>
      item.status === 'active' &&
      (!type || item.item_type === type)
  );

  return filtered.reduce((total, item) => {
    let yearlyAmount = item.amount;

    switch (item.billing_cycle) {
      case 'weekly':
        yearlyAmount = item.amount * 52;
        break;
      case 'monthly':
        yearlyAmount = item.amount * 12;
        break;
      case 'quarterly':
        yearlyAmount = item.amount * 4;
        break;
      case 'yearly':
        yearlyAmount = item.amount;
        break;
    }

    return total + yearlyAmount;
  }, 0);
}

export function getSpendingByCategory(
  items: ItemWithCategory[],
  categories: Category[],
  type?: ItemType
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
    if (item.status !== 'active') return;
    if (type && item.item_type !== type) return;
    if (!item.category_id) return;

    const spending = categoryMap.get(item.category_id);
    if (spending) {
      let monthlyAmount = item.amount;
      switch (item.billing_cycle) {
        case 'weekly':
          monthlyAmount = (item.amount * 52) / 12;
          break;
        case 'monthly':
          monthlyAmount = item.amount;
          break;
        case 'quarterly':
          monthlyAmount = item.amount / 3;
          break;
        case 'yearly':
          monthlyAmount = item.amount / 12;
          break;
      }
      spending.total += monthlyAmount;
      spending.count += 1;
    }
  });

  return Array.from(categoryMap.values())
    .filter((s) => s.count > 0)
    .sort((a, b) => b.total - a.total);
}

export function getUpcomingItems(
  items: ItemWithCategory[],
  days: number = 7,
  type?: ItemType
): ItemWithCategory[] {
  const filtered = items.filter((item) => {
    const activeDue = item.status === 'active' && isDueWithinDays(item.next_billing_date, days);
    return (!type || item.item_type === type) && activeDue;
  });

  return filtered.sort((a, b) => {
    const daysA = getDaysUntil(a.next_billing_date);
    const daysB = getDaysUntil(b.next_billing_date);
    return daysA - daysB;
  });
}

// ============ Date/Maintenance ============

export async function advancePastDueItems(): Promise<number> {
  const todayStr = formatISODate(getToday());
  const userId = await getUserId();

  const { data: pastDueItems, error } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .lt('next_billing_date', todayStr);

  if (error) throw error;
  if (!pastDueItems || pastDueItems.length === 0) return 0;

  const results = await Promise.all(
    pastDueItems.map((item) => {
      const newDate = getNextFutureBillingDate(item.next_billing_date, item.billing_cycle);
      return supabase
        .from('items')
        .update({ next_billing_date: newDate })
        .eq('id', item.id)
        .eq('user_id', userId);
    })
  );
  return results.filter((r) => !r.error).length;
}

export function advanceNextBillingDate(item: Item): string {
  return calcNextBillingDate(item.next_billing_date, item.billing_cycle);
}

export function calculateNextBillingDate(dateStr: string, billingCycle: BillingCycle): string {
  return calcNextBillingDate(dateStr, billingCycle);
}

// ============ Trial Management ============

export async function getExpiringTrials(days: number = 7): Promise<ItemWithCategory[]> {
  const userId = await getUserId();
  const todayStr = formatISODate(getToday());
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  const futureDateStr = formatISODate(futureDate);

  const { data, error } = await supabase
    .from('items')
    .select('*, category:categories(*)')
    .eq('user_id', userId)
    .eq('status', 'trial')
    .not('trial_end_date', 'is', null)
    .gte('trial_end_date', todayStr)
    .lte('trial_end_date', futureDateStr)
    .order('trial_end_date', { ascending: true });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    ...row,
    category: row.category || undefined,
  }));
}

export async function handleExpiredTrials(): Promise<number> {
  const todayStr = formatISODate(getToday());
  const userId = await getUserId();

  // Find trials where trial_end_date has passed
  const { data: expiredTrials, error: fetchError } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'trial')
    .not('trial_end_date', 'is', null)
    .lt('trial_end_date', todayStr);

  if (fetchError) throw fetchError;
  if (!expiredTrials || expiredTrials.length === 0) return 0;

  const results = await Promise.allSettled(
    expiredTrials.map(async (item) => {
      await executeStatusChangeRpc({
        p_item_id: item.id,
        p_action: 'trial_expired',
        p_effective_date: item.trial_end_date,
        p_pause_until: null,
        p_trial_end_date: null,
        p_next_billing_date: null,
        p_clear_fields: [],
        p_reason: 'Trial expired',
        p_notes: `Trial expired on ${item.trial_end_date}`,
        p_today: todayStr,
        p_minimum_effective_date: normalizeDateOnly(item.start_date),
      });

      return item.id;
    })
  );

  const failures = results.filter(r => r.status === 'rejected');
  if (failures.length > 0) {
    console.error(`Failed to expire ${failures.length} trial(s):`, failures);
  }

  return results.reduce((count, result) => {
    if (result.status === 'fulfilled' && result.value) {
      return count + 1;
    }

    return count;
  }, 0);
}
