import { supabase } from '../supabase';
import type { Payment } from '@/types';
import { getUserId } from './shared';

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
  if (error) {
    throw error;
  }

  return data || [];
}

export async function recordPayment(
  itemId: string,
  amount: number,
  paidAt: string,
): Promise<Payment> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('payments')
    .insert({ user_id: userId, item_id: itemId, amount, paid_at: paidAt })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
