export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type ItemType = 'subscription' | 'bill';
export type ItemStatus = 'active' | 'paused' | 'cancelled' | 'archived';

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  category_type: ItemType;
  created_at: string;
}

export interface Item {
  id: string;
  name: string;
  amount: number;
  currency: string;
  billing_cycle: BillingCycle;
  category_id: string | null;
  next_billing_date: string;
  start_date: string;
  notes: string | null;
  url: string | null;
  logo_url: string | null;
  is_active: boolean; // DEPRECATED - use status instead
  status: ItemStatus;
  paused_at: string | null;
  paused_until: string | null;
  cancelled_at: string | null;
  cancellation_date: string | null;
  archived_at: string | null;
  reminder_days: number;
  item_type: ItemType;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  item_id: string;
  amount: number;
  paid_at: string;
  created_at: string;
}

export interface StatusHistory {
  id: string;
  item_id: string;
  user_id: string;
  status: ItemStatus;
  reason: string | null;
  notes: string | null;
  changed_at: string;
}

export interface StatusChangeData {
  action: 'pause' | 'cancel' | 'resume' | 'reactivate';
  pauseUntil?: string; // Optional date for auto-resume (YYYY-MM-DD format)
  pausedOn?: string; // Retroactive date when item was paused (YYYY-MM-DD format)
  cancelledOn?: string; // Retroactive date when item was cancelled (YYYY-MM-DD format)
  resumedOn?: string; // Retroactive date when item was resumed (YYYY-MM-DD format)
  reason?: string;
  notes?: string;
}

// Extended types for UI
export interface ItemWithCategory extends Item {
  category?: Category;
}

export interface SpendingByCategory {
  category: Category;
  total: number;
  count: number;
}

export interface MonthlySpending {
  month: string;
  total: number;
}

export interface AppSettings {
  currency: string;
  defaultReminderDays: number;
  theme: 'light' | 'dark' | 'system';
}

// Form types
export interface ItemFormData {
  name: string;
  amount: string;
  currency: string;
  billing_cycle: BillingCycle;
  category_id: string;
  next_billing_date: string;
  start_date: string;
  notes: string;
  url: string;
  logo_url: string;
  reminder_days: number;
  item_type: ItemType;
}
