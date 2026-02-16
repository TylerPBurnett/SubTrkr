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
  getNextFutureBillingDate,
  parseLocalDate,
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

function getTargetStatus(action: StatusChangeData['action'], currentStatus: ItemStatus): ItemStatus {
  const transitions: Record<string, ItemStatus> = {
    'active-pause': 'paused',
    'active-cancel': 'cancelled',
    'paused-resume': 'active',
    'paused-cancel': 'cancelled',
    'cancelled-reactivate': 'active',
    'archived-reactivate': 'active',
    'trial-convert': 'active',
    'trial-cancel': 'cancelled',
    'trial-pause': 'paused',
  };

  const key = `${currentStatus}-${action}`;
  const newStatus = transitions[key];

  if (!newStatus) {
    throw new Error(`Invalid status transition: ${currentStatus} -> ${action}`);
  }

  return newStatus;
}

export async function executeStatusChange(
  itemId: string,
  data: StatusChangeData
): Promise<void> {
  const userId = await getUserId();
  const item = await getItemById(itemId, userId);
  if (!item) throw new Error('Item not found');

  const newStatus = getTargetStatus(data.action, item.status);
  const now = new Date().toISOString();
  const today = formatISODate(getToday());

  // Prepare update data based on new status
  const updateData: Record<string, unknown> = {
    status: newStatus,
  };

  switch (newStatus) {
    case 'trial':
      updateData.trial_started_at = now;
      if (data.trialEndDate) {
        updateData.trial_end_date = data.trialEndDate;
      }
      break;

    case 'paused':
      // Use retroactive date if provided, otherwise use now
      if (data.pausedOn) {
        const pausedDate = parseLocalDate(data.pausedOn);
        updateData.paused_at = pausedDate.toISOString();
      } else {
        updateData.paused_at = now;
      }
      updateData.paused_until = data.pauseUntil || null;
      break;

    case 'cancelled':
      // Use retroactive date if provided, otherwise use now/today
      if (data.cancelledOn) {
        const cancelledDate = parseLocalDate(data.cancelledOn);
        updateData.cancelled_at = cancelledDate.toISOString();
        updateData.cancellation_date = data.cancelledOn; // Store as YYYY-MM-DD
      } else {
        updateData.cancelled_at = now;
        updateData.cancellation_date = today;
      }
      break;

    case 'active':
      if (data.action === 'convert' && item.amount === 0) {
        throw new Error('Set an amount greater than 0 before converting this trial to paid');
      }

      // Resume: clear all non-active status fields
      updateData.paused_at = null;
      updateData.paused_until = null;
      updateData.cancelled_at = null;
      updateData.cancellation_date = null;
      updateData.archived_at = null;
      updateData.trial_started_at = null;
      updateData.trial_end_date = null;

      // Calculate next billing date
      if (data.convertedOn) {
        // Converting from trial - use conversion date
        updateData.next_billing_date = getNextFutureBillingDate(
          data.convertedOn,
          item.billing_cycle
        );
      } else if (data.resumedOn) {
        // Resuming from pause
        updateData.next_billing_date = getNextFutureBillingDate(
          data.resumedOn,
          item.billing_cycle
        );
      } else {
        // Default: advance from current next_billing_date
        updateData.next_billing_date = getNextFutureBillingDate(
          item.next_billing_date,
          item.billing_cycle
        );
      }
      break;
  }

  // Update item status
  const { error: updateError } = await supabase
    .from('items')
    .update(updateData)
    .eq('id', itemId)
    .eq('user_id', userId);

  if (updateError) throw updateError;

  // Record status change in history
  const { error: historyError } = await supabase
    .from('item_status_history')
    .insert({
      item_id: itemId,
      user_id: userId,
      status: newStatus,
      reason: data.reason || null,
      notes: data.notes || null,
    });

  if (historyError) throw historyError;
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
  const todayStr = formatISODate(getToday());
  const userId = await getUserId();

  // Find cancelled items where cancellation_date < today
  const { data: itemsToArchive, error: fetchError } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'cancelled')
    .lt('cancellation_date', todayStr);

  if (fetchError) throw fetchError;
  if (!itemsToArchive || itemsToArchive.length === 0) return 0;

  const now = new Date().toISOString();
  let archivedCount = 0;

  for (const item of itemsToArchive) {
    const { error: updateError } = await supabase
      .from('items')
      .update({
        status: 'archived',
        archived_at: now
      })
      .eq('id', item.id)
      .eq('user_id', userId);

    if (!updateError) archivedCount++;
  }

  return archivedCount;
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

  let resumedCount = 0;

  for (const item of itemsToResume) {
    try {
      await executeStatusChange(item.id, { action: 'resume' });
      resumedCount++;
    } catch (error) {
      console.error(`Failed to resume item ${item.id}:`, error);
    }
  }

  return resumedCount;
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
      (item.status === 'active' || item.status === 'trial') &&
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
      (item.status === 'active' || item.status === 'trial') &&
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
    if (item.status !== 'active' && item.status !== 'trial') return;
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

export async function getUpcomingItems(
  items: ItemWithCategory[],
  days: number = 7,
  type?: ItemType
): Promise<ItemWithCategory[]> {
  const filtered = items.filter((item) => {
    const activeDue = item.status === 'active' && isDueWithinDays(item.next_billing_date, days);
    const pausedUntil = item.paused_until;
    const pausedDue =
      item.status === 'paused' && pausedUntil ? isDueWithinDays(pausedUntil, days) : false;
    const trialExpiring =
      item.status === 'trial' && item.trial_end_date
        ? isDueWithinDays(item.trial_end_date, days)
        : false;

    return (!type || item.item_type === type) && (activeDue || pausedDue || trialExpiring);
  });

  return filtered.sort((a, b) => {
    let dateA = a.next_billing_date;
    if (a.status === 'paused' && a.paused_until) dateA = a.paused_until;
    if (a.status === 'trial' && a.trial_end_date) dateA = a.trial_end_date;

    let dateB = b.next_billing_date;
    if (b.status === 'paused' && b.paused_until) dateB = b.paused_until;
    if (b.status === 'trial' && b.trial_end_date) dateB = b.trial_end_date;

    const daysA = getDaysUntil(dateA);
    const daysB = getDaysUntil(dateB);
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

  let handledCount = 0;

  // Mark expired trials by setting a flag field
  // Users will need to manually convert or cancel these
  for (const item of expiredTrials) {
    // Record in status history that trial expired
    const { error: historyError } = await supabase
      .from('item_status_history')
      .insert({
        item_id: item.id,
        user_id: userId,
        status: 'trial',
        reason: 'trial_expired',
        notes: `Trial expired on ${item.trial_end_date}`,
      });

    if (!historyError) handledCount++;
  }

  return handledCount;
}
