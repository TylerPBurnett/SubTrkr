import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import type { SubscriptionWithCategory } from '../types';

export async function checkNotificationPermission(): Promise<boolean> {
  let permissionGranted = await isPermissionGranted();

  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === 'granted';
  }

  return permissionGranted;
}

export async function sendRenewalReminder(subscription: SubscriptionWithCategory): Promise<void> {
  const hasPermission = await checkNotificationPermission();
  if (!hasPermission) return;

  const daysUntil = getDaysUntilBilling(subscription.next_billing_date);
  const amount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: subscription.currency,
  }).format(subscription.amount);

  let body: string;
  if (daysUntil === 0) {
    body = `${subscription.name} (${amount}) renews today!`;
  } else if (daysUntil === 1) {
    body = `${subscription.name} (${amount}) renews tomorrow`;
  } else {
    body = `${subscription.name} (${amount}) renews in ${daysUntil} days`;
  }

  await sendNotification({
    title: 'Upcoming Renewal',
    body,
  });
}

export async function checkAndNotifyUpcomingRenewals(
  subscriptions: SubscriptionWithCategory[]
): Promise<void> {
  const hasPermission = await checkNotificationPermission();
  if (!hasPermission) return;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (const sub of subscriptions) {
    if (sub.is_active !== 1) continue;
    if (sub.reminder_days === 0) continue;

    const daysUntil = getDaysUntilBilling(sub.next_billing_date);

    // Send notification if billing is within reminder_days
    if (daysUntil >= 0 && daysUntil <= sub.reminder_days) {
      await sendRenewalReminder(sub);
    }
  }
}

function getDaysUntilBilling(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const billingDate = new Date(dateStr);
  billingDate.setHours(0, 0, 0, 0);
  return Math.ceil((billingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
