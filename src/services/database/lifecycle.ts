import { supabase } from '../supabase';
import type {
  Item,
  ItemWithCategory,
  StatusChangeData,
  StatusHistory,
} from '@/types';
import { formatISODate, getNextFutureBillingDate, getToday } from '../../utils/dates';
import { getItemById } from './catalog';
import {
  buildExecuteStatusChangeRpcParams,
  calculateNextBillingDate,
  normalizeDateOnly,
  type ExecuteItemStatusChangeRpcParams,
} from './lifecycleHelpers';
import {
  getUserId,
  ITEM_WITH_CATEGORY_SELECT,
  mapItemWithCategory,
} from './shared';

export {
  buildExecuteStatusChangeRpcParams,
  calculateNextBillingDate,
  getCanonicalStatusChangeAction,
  getMinimumEffectiveDate,
  getNextBillingDateAfterResume,
  getTargetStatus,
  normalizeDateOnly,
  resolveStatusChangeEffectiveDate,
  type ExecuteItemStatusChangeRpcParams,
  type TransactionalStatusAction,
} from './lifecycleHelpers';

async function executeStatusChangeRpc(
  params: ExecuteItemStatusChangeRpcParams,
): Promise<void> {
  const { error } = await supabase.rpc('execute_item_status_change', params);
  if (error) {
    throw error;
  }
}

export async function toggleItemActive(id: string): Promise<void> {
  const userId = await getUserId();
  const item = await getItemById(id, userId);
  if (!item) {
    return;
  }

  const isResuming = !item.is_active;
  if (isResuming) {
    const newNextDate = getNextFutureBillingDate(
      item.next_billing_date,
      item.billing_cycle,
    );
    const { error } = await supabase
      .from('items')
      .update({ is_active: true, next_billing_date: newNextDate })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabase
    .from('items')
    .update({ is_active: false })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}

export async function executeStatusChange(
  itemId: string,
  data: StatusChangeData,
): Promise<void> {
  const userId = await getUserId();
  const item = await getItemById(itemId, userId);
  if (!item) {
    throw new Error('Item not found');
  }

  await executeStatusChangeRpc(buildExecuteStatusChangeRpcParams(item, data));
}

export async function getStatusHistory(itemId: string): Promise<StatusHistory[]> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('item_status_history')
    .select('*')
    .eq('item_id', itemId)
    .eq('user_id', userId)
    .order('changed_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getStatusHistoryForItems(
  itemIds: string[],
): Promise<StatusHistory[]> {
  const uniqueItemIds = Array.from(new Set(itemIds.filter(Boolean)));
  if (uniqueItemIds.length === 0) {
    return [];
  }

  const userId = await getUserId();
  const { data, error } = await supabase
    .from('item_status_history')
    .select('*')
    .eq('user_id', userId)
    .in('item_id', uniqueItemIds)
    .order('changed_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function advancePastDueItems(): Promise<number> {
  const todayStr = formatISODate(getToday());
  const userId = await getUserId();
  const { data: pastDueItems, error } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .lt('next_billing_date', todayStr);

  if (error) {
    throw error;
  }
  if (!pastDueItems || pastDueItems.length === 0) {
    return 0;
  }

  const results = await Promise.all(
    pastDueItems.map((item) => {
      const newDate = getNextFutureBillingDate(item.next_billing_date, item.billing_cycle);
      return supabase
        .from('items')
        .update({ next_billing_date: newDate })
        .eq('id', item.id)
        .eq('user_id', userId);
    }),
  );

  return results.filter((result) => !result.error).length;
}

export function advanceNextBillingDate(item: Item): string {
  return calculateNextBillingDate(item.next_billing_date, item.billing_cycle);
}

export async function resumePausedItems(): Promise<number> {
  const todayStr = formatISODate(getToday());
  const userId = await getUserId();
  const { data: itemsToResume, error: fetchError } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'paused')
    .not('paused_until', 'is', null)
    .lte('paused_until', todayStr);

  if (fetchError) {
    throw fetchError;
  }
  if (!itemsToResume || itemsToResume.length === 0) {
    return 0;
  }

  const results = await Promise.allSettled(
    itemsToResume.map((item) =>
      executeStatusChange(item.id, {
        action: 'resume',
        resumedOn: item.paused_until || todayStr,
        reason: 'Auto-resumed',
      }),
    ),
  );

  const failures = results.filter((result) => result.status === 'rejected');
  if (failures.length > 0) {
    console.error(`Failed to resume ${failures.length} items:`, failures);
  }

  return results.filter((result) => result.status === 'fulfilled').length;
}

export async function getExpiringTrials(days = 7): Promise<ItemWithCategory[]> {
  const userId = await getUserId();
  const todayStr = formatISODate(getToday());
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  const futureDateStr = formatISODate(futureDate);

  const { data, error } = await supabase
    .from('items')
    .select(ITEM_WITH_CATEGORY_SELECT)
    .eq('user_id', userId)
    .eq('status', 'trial')
    .not('trial_end_date', 'is', null)
    .gte('trial_end_date', todayStr)
    .lte('trial_end_date', futureDateStr)
    .order('trial_end_date', { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map((row) => mapItemWithCategory(row as ItemWithCategory));
}

export async function handleExpiredTrials(): Promise<number> {
  const todayStr = formatISODate(getToday());
  const userId = await getUserId();
  const { data: expiredTrials, error: fetchError } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'trial')
    .not('trial_end_date', 'is', null)
    .lt('trial_end_date', todayStr);

  if (fetchError) {
    throw fetchError;
  }
  if (!expiredTrials || expiredTrials.length === 0) {
    return 0;
  }

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
    }),
  );

  const failures = results.filter((result) => result.status === 'rejected');
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
