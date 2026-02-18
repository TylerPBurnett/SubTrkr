import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import type { ItemWithCategory } from '../types';
import { formatISODate, getDaysUntil, getToday, shouldRemindToday } from '../utils/dates';

const REMINDER_STORAGE_KEY = 'subtrkr-reminder-history';

const HISTORY_MAX_AGE_DAYS = 30;

function loadReminderHistory(): Record<string, string> {
  if (typeof localStorage === 'undefined') return {};

  try {
    const raw = localStorage.getItem(REMINDER_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return pruneHistory(parsed as Record<string, string>);
    }
  } catch {
    return {};
  }

  return {};
}

function pruneHistory(history: Record<string, string>): Record<string, string> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - HISTORY_MAX_AGE_DAYS);
  const cutoffStr = formatISODate(cutoff);

  const pruned: Record<string, string> = {};
  for (const [id, date] of Object.entries(history)) {
    if (date >= cutoffStr) {
      pruned[id] = date;
    }
  }
  return pruned;
}

function saveReminderHistory(history: Record<string, string>): void {
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Ignore write failures (storage disabled, quota, etc.)
  }
}

export async function checkNotificationPermission(): Promise<boolean> {
  let permissionGranted = await isPermissionGranted();

  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === 'granted';
  }

  return permissionGranted;
}

export async function sendRenewalReminder(
  item: ItemWithCategory,
  options?: { skipPermissionCheck?: boolean }
): Promise<void> {
  if (!options?.skipPermissionCheck) {
    const hasPermission = await checkNotificationPermission();
    if (!hasPermission) return;
  }

  const daysUntil = getDaysUntil(item.next_billing_date);
  const amount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: item.currency,
  }).format(item.amount);

  let body: string;
  if (daysUntil === 0) {
    body = `${item.name} (${amount}) is due today!`;
  } else if (daysUntil === 1) {
    body = `${item.name} (${amount}) is due tomorrow`;
  } else {
    body = `${item.name} (${amount}) is due in ${daysUntil} days`;
  }

  await sendNotification({
    title: 'Upcoming Payment',
    body,
  });
}

export async function sendTrialExpiringReminder(
  item: ItemWithCategory,
  options?: { skipPermissionCheck?: boolean }
): Promise<void> {
  if (!options?.skipPermissionCheck) {
    const hasPermission = await checkNotificationPermission();
    if (!hasPermission) return;
  }

  if (!item.trial_end_date) return;

  const daysUntil = getDaysUntil(item.trial_end_date);
  const amount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: item.currency,
  }).format(item.amount);
  const hasPaidAmount = item.amount > 0;

  let body: string;
  if (daysUntil === 0) {
    body = hasPaidAmount
      ? `${item.name} trial expires today! Convert to paid (${amount}/${item.billing_cycle}) or cancel.`
      : `${item.name} trial expires today! Set a paid amount, then convert or cancel.`;
  } else if (daysUntil === 1) {
    body = hasPaidAmount
      ? `${item.name} trial expires tomorrow. Convert to paid (${amount}/${item.billing_cycle}) or cancel.`
      : `${item.name} trial expires tomorrow. Set a paid amount, then convert or cancel.`;
  } else {
    body = hasPaidAmount
      ? `${item.name} trial expires in ${daysUntil} days. Full price: ${amount}/${item.billing_cycle}`
      : `${item.name} trial expires in ${daysUntil} days. Add the paid amount before converting to active.`;
  }

  await sendNotification({
    title: 'Trial Expiring Soon',
    body,
  });
}

export async function checkAndNotifyUpcomingRenewals(
  items: ItemWithCategory[]
): Promise<void> {
  const itemsToNotify = items.filter((item) => {
    if (item.status !== 'active' && item.status !== 'trial') return false;
    const reminderDays = item.reminder_days ?? 0;
    if (reminderDays <= 0) return false;
    return shouldRemindToday(item.next_billing_date, reminderDays);
  });

  if (itemsToNotify.length === 0) return;

  const hasPermission = await checkNotificationPermission();
  if (!hasPermission) return;

  const todayKey = formatISODate(getToday());
  const history = loadReminderHistory();
  let updated = false;

  for (const item of itemsToNotify) {
    if (history[item.id] === todayKey) continue;
    await sendRenewalReminder(item, { skipPermissionCheck: true });
    history[item.id] = todayKey;
    updated = true;
  }

  if (updated) {
    saveReminderHistory(history);
  }
}

export async function checkAndNotifyExpiringTrials(
  items: ItemWithCategory[]
): Promise<void> {
  const trialsToNotify = items.filter((item) => {
    if (item.status !== 'trial') return false;
    if (!item.trial_end_date) return false;
    const reminderDays = item.reminder_days ?? 3; // Default 3 days for trials
    if (reminderDays <= 0) return false;
    return shouldRemindToday(item.trial_end_date, reminderDays);
  });

  if (trialsToNotify.length === 0) return;

  const hasPermission = await checkNotificationPermission();
  if (!hasPermission) return;

  const todayKey = formatISODate(getToday());
  const history = loadReminderHistory();
  let updated = false;

  for (const item of trialsToNotify) {
    const historyKey = `trial_${item.id}`; // Different key to avoid conflicts
    if (history[historyKey] === todayKey) continue;
    await sendTrialExpiringReminder(item, { skipPermissionCheck: true });
    history[historyKey] = todayKey;
    updated = true;
  }

  if (updated) {
    saveReminderHistory(history);
  }
}
