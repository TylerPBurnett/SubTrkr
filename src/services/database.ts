import { supabase } from './supabase';
import type {
  Category,
  Item,
  Payment,
  ItemWithCategory,
  SpendingByCategory,
  BillingCycle,
  ItemType,
} from '../types';
import {
  formatISODate,
  getToday,
  getDaysUntil,
  isDueWithinDays,
  calculateNextBillingDate as calcNextBillingDate,
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
  return items.filter((s) => s.is_active === true);
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
  reminder_days?: number;
}): Promise<Item> {
  const userId = await getUserId();
  const { data: item, error } = await supabase
    .from('items')
    .insert({
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
      reminder_days: data.reminder_days ?? 3,
    })
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
    'is_active',
    'reminder_days',
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
  const filtered = items.filter((item) => {
    if (!item.is_active) return false;
    if (type && item.item_type !== type) return false;
    return true;
  });

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
  const filtered = items.filter((item) => {
    if (!item.is_active) return false;
    if (type && item.item_type !== type) return false;
    return true;
  });

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

export async function getSpendingByCategory(
  items: ItemWithCategory[],
  type?: ItemType
): Promise<SpendingByCategory[]> {
  const categories = await getCategories(type);
  const categoryMap = new Map<string, SpendingByCategory>();

  categories.forEach((category) => {
    categoryMap.set(category.id, {
      category,
      total: 0,
      count: 0,
    });
  });

  items.forEach((item) => {
    if (!item.is_active) return;
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
    if (!item.is_active) return false;
    if (type && item.item_type !== type) return false;
    return isDueWithinDays(item.next_billing_date, days);
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
    .eq('is_active', true)
    .lt('next_billing_date', todayStr);

  if (error) throw error;
  if (!pastDueItems || pastDueItems.length === 0) return 0;

  let updatedCount = 0;
  for (const item of pastDueItems) {
    const newDate = getNextFutureBillingDate(item.next_billing_date, item.billing_cycle);
    const { error: updateError } = await supabase
      .from('items')
      .update({ next_billing_date: newDate })
      .eq('id', item.id)
      .eq('user_id', userId);
    if (!updateError) updatedCount++;
  }
  return updatedCount;
}

export function advanceNextBillingDate(item: Item): string {
  return calcNextBillingDate(item.next_billing_date, item.billing_cycle);
}

export function calculateNextBillingDate(dateStr: string, billingCycle: BillingCycle): string {
  return calcNextBillingDate(dateStr, billingCycle);
}
