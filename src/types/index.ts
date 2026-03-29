export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type ItemType = 'subscription' | 'bill';
export type ItemStatus = 'active' | 'paused' | 'cancelled' | 'archived' | 'trial';

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
  trial_started_at: string | null;
  trial_end_date: string | null;
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
  action: string | null;
  effective_date: string | null;
  changed_at: string;
}

export interface StatusChangeData {
  action:
    | 'pause'
    | 'cancel'
    | 'resume'
    | 'reactivate'
    | 'convert'
    | 'archive'
    | 'edit_cancellation'
    | 'start_trial';
  pauseUntil?: string; // Optional date for auto-resume (YYYY-MM-DD format)
  cancelledOn?: string; // Date when item was cancelled or cancellation date was edited
  resumedOn?: string; // Date when item was resumed or reactivated (YYYY-MM-DD format)
  convertedOn?: string; // Date when trial converted to paid (YYYY-MM-DD format)
  trialEndDate?: string; // Trial end date when starting a trial (YYYY-MM-DD format)
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

// ============ Notifications ============

export type NotificationChannelType = 'telegram' | 'discord' | 'slack';
export type NotificationEventType = 'renewal_reminder' | 'trial_expiration';
export type NotificationLogStatus = 'sent' | 'failed' | 'skipped';

export interface NotificationChannel {
  id: string;
  user_id: string;
  channel: NotificationChannelType;
  enabled: boolean;
  vault_secret_id: string | null;
  secret_value: string | null;
  metadata: Record<string, unknown>;
  event_types: NotificationEventType[];
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  default_reminder_days: number;
  timezone: string;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationLogEntry {
  id: string;
  user_id: string;
  channel: NotificationChannelType;
  event_type: NotificationEventType;
  item_id: string | null;
  status: NotificationLogStatus;
  error_message: string | null;
  sent_at: string;
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
  status?: ItemStatus;
  trial_end_date?: string;
}
