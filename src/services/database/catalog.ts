import { supabase } from '../supabase';
import type {
  BillingCycle,
  Category,
  Item,
  ItemStatus,
  ItemType,
  ItemWithCategory,
} from '@/types';
import {
  assertValidAmountForStatus,
  getUserId,
  ITEM_WITH_CATEGORY_SELECT,
  mapItemWithCategory,
} from './shared';
import { emptyBulkResult, type BulkResult } from './bulkResults';

export interface CreateItemInput {
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
}

export type UpdateItemInput = Partial<
  Omit<Item, 'id' | 'created_at' | 'updated_at'>
>;

export async function getCategories(type?: ItemType): Promise<Category[]> {
  const userId = await getUserId();
  let query = supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('name');

  if (type) {
    query = query.eq('category_type', type);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return data || [];
}

export async function createCategory(
  name: string,
  color: string,
  categoryType: ItemType,
  icon?: string,
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

  if (error) {
    throw error;
  }

  return data;
}

export async function updateCategory(
  id: string,
  name: string,
  color: string,
  icon?: string,
): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase
    .from('categories')
    .update({ name, color, icon: icon || null })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}

export async function deleteCategory(id: string): Promise<void> {
  const userId = await getUserId();
  const { error: updateError } = await supabase
    .from('items')
    .update({ category_id: null })
    .eq('category_id', id)
    .eq('user_id', userId);

  if (updateError) {
    throw updateError;
  }

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}

export async function getItems(type?: ItemType): Promise<ItemWithCategory[]> {
  const userId = await getUserId();
  let query = supabase
    .from('items')
    .select(ITEM_WITH_CATEGORY_SELECT)
    .eq('user_id', userId)
    .order('next_billing_date', { ascending: true });

  if (type) {
    query = query.eq('item_type', type);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data || []).map((row) => mapItemWithCategory(row as ItemWithCategory));
}

export async function getActiveItems(
  type?: ItemType,
): Promise<ItemWithCategory[]> {
  const items = await getItems(type);
  return items.filter((item) => item.status === 'active');
}

export async function getItemById(
  id: string,
  userId?: string,
): Promise<ItemWithCategory | null> {
  const resolvedUserId = userId ?? (await getUserId());
  const { data, error } = await supabase
    .from('items')
    .select(ITEM_WITH_CATEGORY_SELECT)
    .eq('id', id)
    .eq('user_id', resolvedUserId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }

    throw error;
  }

  return mapItemWithCategory(data as ItemWithCategory);
}

export async function createItem(data: CreateItemInput): Promise<Item> {
  const userId = await getUserId();
  const initialStatus = data.status || 'active';
  assertValidAmountForStatus(data.amount, initialStatus);

  const insertData: Record<string, unknown> = {
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

  if (initialStatus === 'trial') {
    insertData.trial_started_at = new Date().toISOString();
    insertData.trial_end_date = data.trial_end_date || null;
  }

  const { data: item, error } = await supabase
    .from('items')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return item;
}

export async function updateItem(
  id: string,
  data: UpdateItemInput,
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
      if (statusError.code === 'PGRST116') {
        throw new Error('Item not found');
      }

      throw statusError;
    }

    assertValidAmountForStatus(data.amount, statusRow.status as ItemStatus);
  }

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
      updateData[field] = data[field as keyof UpdateItemInput];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return;
  }

  const { error } = await supabase
    .from('items')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}

export async function deleteItem(id: string): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}

/**
 * Shared spine for the batched writes below. Dedupes the ids, short-circuits
 * before any network call on empty input, runs one user-scoped statement, and
 * partitions the input against the rows the database actually returned — so a
 * partial result (RLS mismatch, already-deleted row) is detectable rather than
 * silently reported as success.
 *
 * `buildQuery` applies the mutation and must end in `.select('id')`; keeping it
 * as the only difference between callers is what stops the two paths drifting
 * apart on partial-success handling.
 */
async function runBulkWrite(
  ids: string[],
  buildQuery: (
    uniqueIds: string[],
    userId: string,
  ) => PromiseLike<{
    data: { id: string }[] | null;
    error: { message: string } | null;
  }>,
): Promise<BulkResult> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return emptyBulkResult();
  }

  const userId = await getUserId();
  const { data, error } = await buildQuery(uniqueIds, userId);

  if (error) {
    return {
      succeeded: [],
      failed: uniqueIds.map((id) => ({ id, error: error.message })),
      skipped: [],
    };
  }

  const writtenIds = new Set((data ?? []).map((row) => row.id));

  return {
    succeeded: uniqueIds.filter((id) => writtenIds.has(id)),
    failed: uniqueIds
      .filter((id) => !writtenIds.has(id))
      .map((id) => ({ id, error: 'Item not found' })),
    skipped: [],
  };
}

/**
 * Deletes many items in a single statement.
 */
export async function deleteItems(ids: string[]): Promise<BulkResult> {
  return runBulkWrite(ids, (uniqueIds, userId) =>
    supabase
      .from('items')
      .delete()
      .in('id', uniqueIds)
      .eq('user_id', userId)
      .select('id'),
  );
}

/**
 * Reassigns many items to one category in a single statement. A null
 * categoryId clears the category.
 */
export async function updateItemsCategory(
  ids: string[],
  categoryId: string | null,
): Promise<BulkResult> {
  return runBulkWrite(ids, (uniqueIds, userId) =>
    supabase
      .from('items')
      .update({ category_id: categoryId })
      .in('id', uniqueIds)
      .eq('user_id', userId)
      .select('id'),
  );
}
