export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  created_at: string;
}

export interface Subscription {
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
  is_active: number; // SQLite uses 0/1 for boolean
  reminder_days: number;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  subscription_id: string;
  amount: number;
  paid_at: string;
  created_at: string;
}

// Extended types for UI
export interface SubscriptionWithCategory extends Subscription {
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
export interface SubscriptionFormData {
  name: string;
  amount: string;
  currency: string;
  billing_cycle: BillingCycle;
  category_id: string;
  next_billing_date: string;
  start_date: string;
  notes: string;
  url: string;
  reminder_days: number;
}
