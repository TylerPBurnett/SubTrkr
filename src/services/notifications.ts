import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import type { ItemWithCategory } from '../types';
import { formatISODate, getDaysUntil, getToday, shouldRemindToday } from '../utils/dates';

const REMINDER_STORAGE_KEY = 'subtrkr-reminder-history';

function loadReminderHistory(): Record<string, string> {
  if (typeof localStorage === 'undefined') return {};

  try {
    const raw = localStorage.getItem(REMINDER_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, string>;
    }
  } catch {
    return {};
  }

  return {};
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

export async function checkAndNotifyUpcomingRenewals(
  items: ItemWithCategory[]
): Promise<void> {
  const itemsToNotify = items.filter((item) => {
    if (!item.is_active) return false;
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
