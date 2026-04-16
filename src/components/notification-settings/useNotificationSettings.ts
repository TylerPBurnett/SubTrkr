import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  NotificationChannel,
  NotificationChannelType,
  NotificationLogEntry,
  NotificationPreferences,
} from '@/types';
import {
  deleteNotificationChannel,
  getNotificationChannels,
  getNotificationLog,
  getNotificationPreferences,
  sendTestNotification,
  upsertNotificationChannel,
  upsertNotificationPreferences,
} from '@/services/notificationChannels';
import { validateTelegramBotToken } from '@/services/telegramValidator';
import { validateWebhookUrl } from '@/services/webhookValidator';

export function useNotificationSettings() {
  const mountedRef = useRef(true);
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);
  const [log, setLog] = useState<NotificationLogEntry[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupChannel, setSetupChannel] =
    useState<NotificationChannelType | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<NotificationChannelType | null>(null);
  const [testResult, setTestResult] = useState<{
    channel: NotificationChannelType;
    success: boolean;
    error?: string;
  } | null>(null);
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramBotName, setTelegramBotName] = useState('');
  const [telegramStep, setTelegramStep] = useState<1 | 2>(1);
  const [telegramVerifying, setTelegramVerifying] = useState(false);
  const [telegramPolling, setTelegramPolling] = useState(false);
  const savingWebhookRef = useRef(false);
  const detectingTelegramRef = useRef(false);
  const verifyingTelegramRef = useRef(false);

  const loadData = useCallback(async () => {
    try {
      const [channelsData, preferencesData, logData] = await Promise.all([
        getNotificationChannels(),
        getNotificationPreferences(),
        getNotificationLog(),
      ]);
      if (!mountedRef.current) {
        return;
      }
      setChannels(channelsData);
      setPreferences(preferencesData);
      setLog(logData);
    } catch (err) {
      console.error('Failed to load notification settings:', err);
      if (mountedRef.current) {
        setError('Failed to load notification settings. Please try again.');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void loadData();

    return () => {
      mountedRef.current = false;
    };
  }, [loadData]);

  const getChannelConfig = useCallback(
    (type: NotificationChannelType) => {
      return channels.find((channel) => channel.channel === type);
    },
    [channels],
  );

  const isChannelConnected = useCallback(
    (type: NotificationChannelType) => {
      const channel = getChannelConfig(type);
      if (!channel) {
        return false;
      }

      if (type === 'telegram') {
        const chatId = channel.metadata?.chat_id;
        return typeof chatId === 'string' && chatId.length > 0;
      }

      return true;
    },
    [getChannelConfig],
  );

  const resetTelegramSetup = () => {
    setTelegramBotToken('');
    setTelegramBotName('');
    setTelegramStep(1);
  };

  return {
    channels,
    error,
    getChannelConfig,
    isChannelConnected,
    loading,
    log,
    preferences,
    saving,
    setupChannel,
    showLog,
    telegramBotName,
    telegramBotToken,
    telegramPolling,
    telegramStep,
    telegramVerifying,
    testResult,
    testing,
    webhookUrl,
    setError,
    setSetupChannel,
    setShowLog,
    setTelegramBotToken,
    setTelegramStep,
    setWebhookUrl,
    handleCancelSetup: () => {
      setSetupChannel(null);
      setWebhookUrl('');
      resetTelegramSetup();
    },
    handleDetectTelegramChat: async () => {
      if (detectingTelegramRef.current) {
        return;
      }

      const validation = validateTelegramBotToken(telegramBotToken);
      if (!validation.ok) {
        setError(validation.error);
        return;
      }

      detectingTelegramRef.current = true;
      setTelegramPolling(true);
      setError(null);
      try {
        const response = await fetch(
          `https://api.telegram.org/bot${validation.token}/getUpdates?limit=10`,
        );
        const data = await response.json();
        if (!mountedRef.current) {
          return;
        }
        if (!data.ok || !data.result?.length) {
          setError(
            'No messages found. Make sure you sent /start to your bot, then try again.',
          );
          return;
        }

        const startMessage = data.result
          .reverse()
          .find((update: { message?: { text?: string } }) => {
            return update.message?.text === '/start';
          });
        const chatId =
          startMessage?.message?.chat?.id ?? data.result[0]?.message?.chat?.id;
        if (!chatId) {
          setError('Could not detect chat ID. Send /start to your bot and try again.');
          return;
        }

        setSaving(true);
        await upsertNotificationChannel('telegram', {
          enabled: true,
          secret_value: validation.token,
          metadata: { chat_id: String(chatId), bot_name: telegramBotName },
        });
        if (!mountedRef.current) {
          return;
        }
        resetTelegramSetup();
        setSetupChannel(null);
        await loadData();
      } catch {
        if (mountedRef.current) {
          setError('Failed to connect Telegram bot.');
        }
      } finally {
        if (mountedRef.current) {
          setTelegramPolling(false);
          setSaving(false);
        }
        detectingTelegramRef.current = false;
      }
    },
    handleDisconnect: async (type: NotificationChannelType) => {
      setError(null);
      try {
        await deleteNotificationChannel(type);
        if (!mountedRef.current) {
          return;
        }
        await loadData();
      } catch (err) {
        console.error('Failed to disconnect channel:', err);
        if (mountedRef.current) {
          setError('Failed to disconnect channel. Please try again.');
        }
      }
    },
    handleSaveWebhook: async (type: NotificationChannelType) => {
      if (savingWebhookRef.current) {
        return;
      }

      const validation = validateWebhookUrl(type, webhookUrl);
      if (!validation.ok) {
        setError(validation.error);
        return;
      }

      savingWebhookRef.current = true;
      setSaving(true);
      setError(null);
      try {
        await upsertNotificationChannel(type, {
          enabled: true,
          secret_value: validation.url,
        });
        if (!mountedRef.current) {
          return;
        }
        setWebhookUrl('');
        setSetupChannel(null);
        await loadData();
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to save webhook');
        }
      } finally {
        if (mountedRef.current) {
          setSaving(false);
        }
        savingWebhookRef.current = false;
      }
    },
    handleStartSetup: (type: NotificationChannelType) => {
      if (type === 'telegram') {
        resetTelegramSetup();
      } else {
        setWebhookUrl('');
      }

      setSetupChannel(type);
    },
    handleTest: async (type: NotificationChannelType) => {
      setTesting(type);
      setTestResult(null);
      try {
        const result = await sendTestNotification(type);
        setTestResult({ channel: type, ...result });
      } catch (err) {
        setTestResult({
          channel: type,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      } finally {
        setTesting(null);
      }
    },
    handleToggleChannel: async (type: NotificationChannelType) => {
      const channel = getChannelConfig(type);
      if (!channel) {
        return;
      }

      setError(null);
      try {
        await upsertNotificationChannel(type, { enabled: !channel.enabled });
        if (!mountedRef.current) {
          return;
        }
        await loadData();
      } catch (err) {
        console.error('Failed to toggle channel:', err);
        if (mountedRef.current) {
          setError('Failed to update channel. Please try again.');
        }
      }
    },
    handleUpdatePreference: async (key: string, value: unknown) => {
      setError(null);
      try {
        await upsertNotificationPreferences({ [key]: value });
        if (!mountedRef.current) {
          return;
        }
        await loadData();
      } catch (err) {
        console.error('Failed to update preference:', err);
        if (mountedRef.current) {
          setError('Failed to update preferences. Please try again.');
        }
      }
    },
    handleVerifyTelegramBot: async () => {
      if (verifyingTelegramRef.current) {
        return;
      }

      const validation = validateTelegramBotToken(telegramBotToken);
      if (!validation.ok) {
        setError(validation.error);
        return;
      }

      verifyingTelegramRef.current = true;
      setTelegramVerifying(true);
      setError(null);
      try {
        const response = await fetch(
          `https://api.telegram.org/bot${validation.token}/getMe`,
        );
        const data = await response.json();
        if (!mountedRef.current) {
          return;
        }
        if (!data.ok) {
          setError('Invalid bot token. Please check and try again.');
          return;
        }

        setTelegramBotName(data.result.first_name || data.result.username);
        setTelegramStep(2);
      } catch {
        if (mountedRef.current) {
          setError('Could not verify bot token. Check your connection and try again.');
        }
      } finally {
        if (mountedRef.current) {
          setTelegramVerifying(false);
        }
        verifyingTelegramRef.current = false;
      }
    },
  };
}
