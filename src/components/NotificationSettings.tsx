import { useState, useEffect, useCallback } from 'react';
import type React from 'react';
import {
  Bell,
  MessageCircle,
  Hash,
  Send,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  Link2,
  Unlink,
  TestTube,
  Clock,
  Globe,
} from 'lucide-react';
import type {
  NotificationChannel,
  NotificationChannelType,
  NotificationPreferences,
  NotificationLogEntry,
} from '../types';
import {
  getNotificationChannels,
  upsertNotificationChannel,
  deleteNotificationChannel,
  getNotificationPreferences,
  upsertNotificationPreferences,
  sendTestNotification,
  getNotificationLog,
} from '../services/notificationChannels';

// Channel display config
const CHANNEL_CONFIG: Record<
  NotificationChannelType,
  { label: string; icon: React.ReactNode; color: string; description: string }
> = {
  telegram: {
    label: 'Telegram',
    icon: <Send className="w-5 h-5" />,
    color: '#0088cc',
    description: 'Get notified via Telegram bot',
  },
  discord: {
    label: 'Discord',
    icon: <Hash className="w-5 h-5" />,
    color: '#5865F2',
    description: 'Send notifications to a Discord channel',
  },
  slack: {
    label: 'Slack',
    icon: <MessageCircle className="w-5 h-5" />,
    color: '#4A154B',
    description: 'Send notifications to a Slack channel',
  },
};

// Common timezones for the selector
const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Australia/Sydney',
  'Pacific/Auckland',
];


export default function NotificationSettings() {
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [log, setLog] = useState<NotificationLogEntry[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Channel setup state
  const [setupChannel, setSetupChannel] = useState<NotificationChannelType | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<NotificationChannelType | null>(null);
  const [testResult, setTestResult] = useState<{ channel: NotificationChannelType; success: boolean; error?: string } | null>(null);

  // Telegram setup state (user-owned bot)
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramBotName, setTelegramBotName] = useState('');
  const [telegramStep, setTelegramStep] = useState<1 | 2>(1);
  const [telegramVerifying, setTelegramVerifying] = useState(false);
  const [telegramPolling, setTelegramPolling] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [channelsData, prefsData, logData] = await Promise.all([
        getNotificationChannels(),
        getNotificationPreferences(),
        getNotificationLog(),
      ]);
      setChannels(channelsData);
      setPreferences(prefsData);
      setLog(logData);
    } catch (err) {
      console.error('Failed to load notification settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getChannelConfig = (type: NotificationChannelType): NotificationChannel | undefined =>
    channels.find((c) => c.channel === type);

  const isChannelConnected = (type: NotificationChannelType): boolean => {
    const ch = getChannelConfig(type);
    if (!ch || !ch.secret_value) return false;
    if (type === 'telegram') return !!ch.metadata?.chat_id;
    return true;
  };

  // === Webhook setup (Discord / Slack) ===
  const handleSaveWebhook = async (channel: NotificationChannelType) => {
    if (!webhookUrl.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await upsertNotificationChannel(channel, {
        enabled: true,
        secret_value: webhookUrl.trim(),
      });

      setWebhookUrl('');
      setSetupChannel(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save webhook');
    } finally {
      setSaving(false);
    }
  };

  // === Telegram setup (user-owned bot) ===
  const handleVerifyTelegramBot = async () => {
    if (!telegramBotToken.trim()) return;
    setTelegramVerifying(true);
    setError(null);
    try {
      const resp = await fetch(`https://api.telegram.org/bot${telegramBotToken.trim()}/getMe`);
      const data = await resp.json();
      if (!data.ok) {
        setError('Invalid bot token. Please check and try again.');
        return;
      }
      setTelegramBotName(data.result.first_name || data.result.username);
      setTelegramStep(2);
    } catch {
      setError('Could not verify bot token. Check your connection and try again.');
    } finally {
      setTelegramVerifying(false);
    }
  };

  const handleDetectTelegramChat = async () => {
    if (!telegramBotToken.trim()) return;
    setTelegramPolling(true);
    setError(null);
    try {
      const resp = await fetch(`https://api.telegram.org/bot${telegramBotToken.trim()}/getUpdates?limit=10`);
      const data = await resp.json();
      if (!data.ok || !data.result?.length) {
        setError('No messages found. Make sure you sent /start to your bot, then try again.');
        return;
      }
      // Find the most recent /start message's chat ID
      const startMsg = data.result
        .reverse()
        .find((u: { message?: { text?: string } }) => u.message?.text === '/start');
      const chatId = startMsg?.message?.chat?.id ?? data.result[0]?.message?.chat?.id;
      if (!chatId) {
        setError('Could not detect chat ID. Send /start to your bot and try again.');
        return;
      }
      // Save directly
      setSaving(true);
      await upsertNotificationChannel('telegram', {
        enabled: true,
        secret_value: telegramBotToken.trim(),
        metadata: { chat_id: String(chatId), bot_name: telegramBotName },
      });
      setTelegramBotToken('');
      setTelegramBotName('');
      setTelegramStep(1);
      setSetupChannel(null);
      await loadData();
    } catch {
      setError('Failed to connect Telegram bot.');
    } finally {
      setTelegramPolling(false);
      setSaving(false);
    }
  };

  const handleStartTelegramSetup = () => {
    setSetupChannel('telegram');
    setTelegramStep(1);
    setTelegramBotToken('');
    setTelegramBotName('');
  };

  // === Toggle channel ===
  const handleToggleChannel = async (type: NotificationChannelType) => {
    const ch = getChannelConfig(type);
    if (!ch) return;
    try {
      await upsertNotificationChannel(type, { enabled: !ch.enabled });
      await loadData();
    } catch (err) {
      console.error('Failed to toggle channel:', err);
    }
  };

  // === Disconnect channel ===
  const handleDisconnect = async (type: NotificationChannelType) => {
    try {
      await deleteNotificationChannel(type);
      await loadData();
    } catch (err) {
      console.error('Failed to disconnect channel:', err);
    }
  };

  // === Test notification ===
  const handleTest = async (type: NotificationChannelType) => {
    setTesting(type);
    setTestResult(null);
    try {
      const result = await sendTestNotification(type);
      setTestResult({ channel: type, ...result });
    } catch (err) {
      setTestResult({ channel: type, success: false, error: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setTesting(null);
    }
  };

  // === Preferences ===
  const handleUpdatePreference = async (key: string, value: unknown) => {
    try {
      await upsertNotificationPreferences({ [key]: value });
      await loadData();
    } catch (err) {
      console.error('Failed to update preference:', err);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
          <span style={{ color: 'var(--text-muted)' }}>Loading notification settings...</span>
        </div>
      </div>
    );
  }

  const renderChannelRow = (type: NotificationChannelType) => {
    const config = CHANNEL_CONFIG[type];
    const channel = getChannelConfig(type);
    const connected = isChannelConnected(type);
    const isSettingUp = setupChannel === type;

    return (
      <div
        key={type}
        className="p-4 rounded-xl transition-all"
        style={{ backgroundColor: 'var(--bg-hover)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: config.color + '20', color: config.color }}
            >
              {config.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  {config.label}
                </span>
                {connected && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: 'var(--accent-green)' + '20', color: 'var(--accent-green)' }}
                  >
                    Connected
                  </span>
                )}
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {config.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {connected && (
              <>
                {/* Toggle */}
                <button
                  onClick={() => handleToggleChannel(type)}
                  className="relative w-10 h-5 rounded-full transition-colors"
                  style={{
                    backgroundColor: channel?.enabled ? 'var(--brand-primary)' : 'var(--bg-active)',
                  }}
                >
                  <div
                    className="absolute top-0.5 w-4 h-4 rounded-full transition-transform"
                    style={{
                      backgroundColor: 'white',
                      transform: channel?.enabled ? 'translateX(22px)' : 'translateX(2px)',
                    }}
                  />
                </button>

                {/* Test */}
                <button
                  onClick={() => handleTest(type)}
                  disabled={testing === type || !channel?.enabled}
                  className="p-1.5 rounded-lg transition-colors disabled:opacity-50"
                  style={{ color: 'var(--text-muted)' }}
                  title="Send test notification"
                >
                  {testing === type ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4" />
                  )}
                </button>

                {/* Disconnect */}
                <button
                  onClick={() => handleDisconnect(type)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--accent-red)' }}
                  title="Disconnect"
                >
                  <Unlink className="w-4 h-4" />
                </button>
              </>
            )}

            {!connected && !isSettingUp && (
              <button
                onClick={() => {
                  if (type === 'telegram') {
                    handleStartTelegramSetup();
                  } else {
                    setSetupChannel(type);
                    setWebhookUrl('');
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: config.color + '15',
                  color: config.color,
                }}
              >
                <Link2 className="w-3.5 h-3.5" />
                Connect
              </button>
            )}
          </div>
        </div>

        {/* Test result */}
        {testResult?.channel === type && (
          <div
            className="mt-3 p-2 rounded-lg text-sm flex items-center gap-2"
            style={{
              backgroundColor: testResult.success ? 'var(--accent-green)' + '15' : 'var(--accent-red)' + '15',
              color: testResult.success ? 'var(--accent-green)' : 'var(--accent-red)',
            }}
          >
            {testResult.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {testResult.success ? 'Test notification sent!' : testResult.error || 'Failed to send'}
          </div>
        )}

        {/* Setup forms */}
        {isSettingUp && type !== 'telegram' && (
          <div className="mt-3 space-y-2">
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder={
                type === 'discord'
                  ? 'https://discord.com/api/webhooks/...'
                  : 'https://hooks.slack.com/services/...'
              }
              className="input w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': config.color } as React.CSSProperties}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSaveWebhook(type)}
                disabled={saving || !webhookUrl.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: config.color, color: 'white' }}
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save
              </button>
              <button
                onClick={() => {
                  setSetupChannel(null);
                  setWebhookUrl('');
                }}
                className="btn-secondary px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {type === 'discord'
                ? 'Go to Server Settings > Integrations > Webhooks in Discord to create a webhook URL.'
                : 'Go to your Slack workspace settings and create an Incoming Webhook app.'}
            </p>
          </div>
        )}

        {/* Telegram setup flow (user-owned bot) */}
        {isSettingUp && type === 'telegram' && (
          <div className="mt-3 space-y-3">
            {/* Step 1: Enter and verify bot token */}
            {telegramStep === 1 && (
              <div
                className="p-3 rounded-lg text-sm space-y-3"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
              >
                <div>
                  <p className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Step 1: Create Your Bot
                  </p>
                  <ol className="space-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <li>1. Open Telegram and search for <code className="px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-hover)' }}>@BotFather</code></li>
                    <li>2. Send <code className="px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-hover)' }}>/newbot</code> and follow the prompts</li>
                    <li>3. Copy the bot token BotFather gives you</li>
                  </ol>
                </div>
                <input
                  type="text"
                  value={telegramBotToken}
                  onChange={(e) => setTelegramBotToken(e.target.value)}
                  placeholder="Paste your bot token here"
                  className="input w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': config.color } as React.CSSProperties}
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleVerifyTelegramBot}
                    disabled={!telegramBotToken.trim() || telegramVerifying}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    style={{ backgroundColor: config.color, color: 'white' }}
                  >
                    {telegramVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Verify Bot
                  </button>
                  <button
                    onClick={() => {
                      setSetupChannel(null);
                      setTelegramBotToken('');
                      setTelegramBotName('');
                      setTelegramStep(1);
                    }}
                    className="btn-secondary px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Send /start and auto-detect chat ID */}
            {telegramStep === 2 && (
              <div
                className="p-3 rounded-lg text-sm space-y-3"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
              >
                <div
                  className="flex items-center gap-2 p-2 rounded-lg"
                  style={{ backgroundColor: 'var(--accent-green)' + '15', color: 'var(--accent-green)' }}
                >
                  <Check className="w-4 h-4" />
                  <span className="text-xs font-medium">Bot verified: {telegramBotName}</span>
                </div>
                <div>
                  <p className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Step 2: Link Your Account
                  </p>
                  <ol className="space-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <li>1. Open Telegram and find your bot (<strong>{telegramBotName}</strong>)</li>
                    <li>2. Send <code className="px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-hover)' }}>/start</code> to it</li>
                    <li>3. Come back here and click the button below</li>
                  </ol>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDetectTelegramChat}
                    disabled={telegramPolling || saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    style={{ backgroundColor: config.color, color: 'white' }}
                  >
                    {telegramPolling || saving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Link2 className="w-3.5 h-3.5" />
                    )}
                    {telegramPolling ? 'Detecting...' : saving ? 'Connecting...' : "I sent /start"}
                  </button>
                  <button
                    onClick={() => setTelegramStep(1)}
                    className="btn-secondary px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      setSetupChannel(null);
                      setTelegramBotToken('');
                      setTelegramBotName('');
                      setTelegramStep(1);
                    }}
                    className="btn-secondary px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in">
      {/* Unified Notifications Card — Channels + Preferences */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--bg-hover)' }}
          >
            <Bell className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Notifications
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Manage channels and reminder preferences
            </p>
          </div>
        </div>

        {error && (
          <div
            className="mb-4 p-3 rounded-lg text-sm flex items-center justify-between"
            style={{ backgroundColor: 'var(--accent-red)' + '15', color: 'var(--accent-red)' }}
          >
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Channels Sub-section */}
        <div className="label mb-3">Channels</div>
        <div className="space-y-3">
          {/* Desktop notifications (always present) */}
          <div
            className="p-4 rounded-xl"
            style={{ backgroundColor: 'var(--bg-hover)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'var(--brand-primary)' + '20', color: 'var(--brand-primary)' }}
                >
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      Desktop
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: 'var(--accent-green)' + '20', color: 'var(--accent-green)' }}
                    >
                      Built-in
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Native system notifications (works when app is open)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {renderChannelRow('telegram')}
          {renderChannelRow('discord')}
          {renderChannelRow('slack')}

          {/* WhatsApp placeholder */}
          <div
            className="p-4 rounded-xl opacity-50"
            style={{ backgroundColor: 'var(--bg-hover)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: '#25D36620', color: '#25D366' }}
                >
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      WhatsApp
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: 'var(--bg-active)', color: 'var(--text-muted)' }}
                    >
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    WhatsApp Business API integration
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="my-6" style={{ borderTop: '1px solid var(--border-default)' }} />

        {/* Preferences Sub-section */}
        <div className="label mb-3">Preferences</div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Default Reminder Days
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={preferences?.default_reminder_days ?? 3}
              onChange={(e) => handleUpdatePreference('default_reminder_days', parseInt(e.target.value) || 3)}
              className="input w-24 px-3 py-2 rounded-lg text-sm"
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Days before a payment is due to send a reminder (can be overridden per item)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              <Globe className="w-3.5 h-3.5 inline mr-1.5" />
              Timezone
            </label>
            <select
              value={preferences?.timezone ?? 'UTC'}
              onChange={(e) => handleUpdatePreference('timezone', e.target.value)}
              className="input px-3 py-2 rounded-lg text-sm"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Used for server-side notification delivery timing
            </p>
          </div>
        </div>
      </div>

      {/* Notification History — separate collapsible card */}
      <div className="card">
        <button
          onClick={() => setShowLog(!showLog)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--bg-hover)' }}
            >
              <Clock className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Notification History
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Recent notification delivery log
              </p>
            </div>
          </div>
          {showLog ? (
            <ChevronUp className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          ) : (
            <ChevronDown className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          )}
        </button>

        {showLog && (
          <div className="mt-4 space-y-2">
            {log.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                No notifications sent yet.
              </p>
            ) : (
              log.map((entry) => {
                const channelConfig = CHANNEL_CONFIG[entry.channel];
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-2 rounded-lg text-sm"
                    style={{ backgroundColor: 'var(--bg-hover)' }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center"
                        style={{
                          backgroundColor: channelConfig?.color + '20',
                          color: channelConfig?.color,
                        }}
                      >
                        {channelConfig?.icon}
                      </div>
                    <span style={{ color: 'var(--text-primary)' }}>
                      {entry.event_type === 'renewal_reminder' ? 'Renewal' : 'Trial'} reminder
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor:
                          entry.status === 'sent'
                            ? 'var(--accent-green)' + '20'
                            : entry.status === 'failed'
                              ? 'var(--accent-red)' + '20'
                              : 'var(--bg-active)',
                        color:
                          entry.status === 'sent'
                            ? 'var(--accent-green)'
                            : entry.status === 'failed'
                              ? 'var(--accent-red)'
                              : 'var(--text-muted)',
                      }}
                    >
                      {entry.status}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(entry.sent_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
