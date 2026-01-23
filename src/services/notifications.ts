import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import type { ItemWithCategory } from '../types';
import { getDaysUntil, shouldRemindToday } from '../utils/dates';

export async function checkNotificationPermission(): Promise<boolean> {
  let permissionGranted = await isPermissionGranted();

  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === 'granted';
  }

  return permissionGranted;
}

export async function sendRenewalReminder(item: ItemWithCategory): Promise<void> {
  const hasPermission = await checkNotificationPermission();
  if (!hasPermission) return;

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
  const hasPermission = await checkNotificationPermission();
  if (!hasPermission) return;

  for (const item of items) {
    if (!item.is_active) continue;
    if (item.reminder_days === 0) continue;

    // Send notification if billing is within reminder_days
    if (shouldRemindToday(item.next_billing_date, item.reminder_days)) {
      await sendRenewalReminder(item);
    }
  }
}
