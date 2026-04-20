import { supabase } from '../supabase';
import type { ItemStatus, ItemWithCategory } from '@/types';

export const ITEM_WITH_CATEGORY_SELECT = '*, category:categories(*)';

export async function getUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  return user.id;
}

export function assertValidAmountForStatus(
  amount: number,
  status: ItemStatus,
): void {
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

export function mapItemWithCategory(row: ItemWithCategory): ItemWithCategory {
  return {
    ...row,
    category: row.category ?? undefined,
  };
}
