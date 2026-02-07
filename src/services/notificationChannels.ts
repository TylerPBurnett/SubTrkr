import { supabase } from './supabase';
import type {
  NotificationChannel,
  NotificationChannelType,
  NotificationPreferences,
  NotificationLogEntry,
  NotificationEventType,
} from '@/types';

// Helper to get current user ID (same pattern as database.ts)
async function getUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

// ============ Channels ============

export async function getNotificationChannels(): Promise<NotificationChannel[]> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('notification_channels')
    .select('*')
    .eq('user_id', userId)
    .order('channel');

  if (error) throw error;
  return data ?? [];
}

export async function upsertNotificationChannel(
  channel: NotificationChannelType,
  config: {
    enabled?: boolean;
    metadata?: Record<string, unknown>;
    event_types?: NotificationEventType[];
    secret_value?: string | null;
  }
): Promise<NotificationChannel> {
  const userId = await getUserId();

  // Preserve existing values when performing partial updates
  const { data: existing } = await supabase
    .from('notification_channels')
    .select('*')
    .eq('user_id', userId)
    .eq('channel', channel)
    .maybeSingle();

  const payload = {
    user_id: userId,
    channel,
    enabled: config.enabled ?? existing?.enabled ?? true,
    metadata: config.metadata ?? existing?.metadata ?? {},
    event_types: config.event_types ?? existing?.event_types ?? ['renewal_reminder', 'trial_expiration'],
    secret_value: config.secret_value ?? existing?.secret_value ?? null,
  };

  const { data, error } = await supabase
    .from('notification_channels')
    .upsert(payload, { onConflict: 'user_id,channel' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteNotificationChannel(channelType: NotificationChannelType): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase
    .from('notification_channels')
    .delete()
    .eq('user_id', userId)
    .eq('channel', channelType);

  if (error) throw error;
}

// ============ Preferences ============

export async function getNotificationPreferences(): Promise<NotificationPreferences | null> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertNotificationPreferences(
  prefs: Partial<Omit<NotificationPreferences, 'user_id' | 'created_at' | 'updated_at'>>
): Promise<NotificationPreferences> {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert(
      { user_id: userId, ...prefs },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============ Test Notification ============

export async function sendTestNotification(
  channel: NotificationChannelType
): Promise<{ success: boolean; error?: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const { data, error } = await supabase.functions.invoke('send-notifications', {
    body: { test: true, channel },
  });

  if (error) {
    const detail =
      (error as any)?.context?.body?.error ||
      (error as any)?.context?.body?.message ||
      error.message;
    return { success: false, error: detail };
  }
  if (data?.error) {
    return { success: false, error: data.error };
  }
  return data ?? { success: true };
}

// ============ Notification Log ============

export async function getNotificationLog(limit = 20): Promise<NotificationLogEntry[]> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('notification_log')
    .select('*')
    .eq('user_id', userId)
    .order('sent_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
