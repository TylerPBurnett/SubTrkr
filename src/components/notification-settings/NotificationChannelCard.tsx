import {
  Check,
  Link2,
  Loader2,
  TestTube,
  Unlink,
  X,
} from 'lucide-react';
import { Switch } from '@/components/ui/Switch';
import type { NotificationChannel, NotificationChannelType } from '@/types';
import { CHANNEL_CONFIG } from './constants';
import { ChannelLogo } from './ChannelLogo';
import { TelegramSetupFlow } from './TelegramSetupFlow';
import { WebhookSetupForm } from './WebhookSetupForm';

interface NotificationChannelCardProps {
  channel?: NotificationChannel;
  error?: string | null;
  isConnected: boolean;
  isSettingUp: boolean;
  saving: boolean;
  telegramBotName: string;
  telegramBotToken: string;
  telegramPolling: boolean;
  telegramStep: 1 | 2;
  telegramVerifying: boolean;
  testResult:
    | { channel: NotificationChannelType; success: boolean; error?: string }
    | null;
  testing: NotificationChannelType | null;
  type: NotificationChannelType;
  webhookUrl: string;
  onCancelSetup: () => void;
  onDetectTelegramChat: () => void;
  onDisconnect: () => void;
  onSaveWebhook: () => void;
  onSetTelegramStep: (step: 1 | 2) => void;
  onStartSetup: () => void;
  onTelegramTokenChange: (value: string) => void;
  onTest: () => void;
  onToggle: () => void;
  onVerifyTelegramBot: () => void;
  onWebhookUrlChange: (value: string) => void;
}

export function NotificationChannelCard({
  channel,
  isConnected,
  isSettingUp,
  saving,
  telegramBotName,
  telegramBotToken,
  telegramPolling,
  telegramStep,
  telegramVerifying,
  testResult,
  testing,
  type,
  webhookUrl,
  onCancelSetup,
  onDetectTelegramChat,
  onDisconnect,
  onSaveWebhook,
  onSetTelegramStep,
  onStartSetup,
  onTelegramTokenChange,
  onTest,
  onToggle,
  onVerifyTelegramBot,
  onWebhookUrlChange,
}: NotificationChannelCardProps) {
  const config = CHANNEL_CONFIG[type];

  return (
    <div className="p-4 rounded-xl transition-all" style={{ backgroundColor: 'var(--bg-hover)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChannelLogo
            domain={config.domain}
            icon={config.icon}
            color={config.color}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {config.label}
              </span>
              {isConnected && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: 'var(--accent-green)20',
                    color: 'var(--accent-green)',
                  }}
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
          {isConnected && (
            <>
              <Switch
                checked={Boolean(channel?.enabled)}
                onCheckedChange={onToggle}
                aria-label={`Toggle ${config.label} notifications`}
              />
              <button
                onClick={onTest}
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
              <button
                onClick={onDisconnect}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--accent-red)' }}
                title="Disconnect"
              >
                <Unlink className="w-4 h-4" />
              </button>
            </>
          )}

          {!isConnected && !isSettingUp && (
            <button
              onClick={onStartSetup}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: `${config.color}15`,
                color: config.color,
              }}
            >
              <Link2 className="w-3.5 h-3.5" />
              Connect
            </button>
          )}
        </div>
      </div>

      {testResult?.channel === type && (
        <div
          className="mt-3 p-2 rounded-lg text-sm flex items-center gap-2"
          style={{
            backgroundColor: testResult.success
              ? 'var(--accent-green)15'
              : 'var(--accent-red)15',
            color: testResult.success
              ? 'var(--accent-green)'
              : 'var(--accent-red)',
          }}
        >
          {testResult.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {testResult.success
            ? 'Test notification sent!'
            : testResult.error || 'Failed to send'}
        </div>
      )}

      {isSettingUp && type !== 'telegram' && (
        <WebhookSetupForm
          channelType={type}
          color={config.color}
          saving={saving}
          value={webhookUrl}
          onCancel={onCancelSetup}
          onChange={onWebhookUrlChange}
          onSave={onSaveWebhook}
        />
      )}

      {isSettingUp && type === 'telegram' && (
        <TelegramSetupFlow
          botName={telegramBotName}
          botToken={telegramBotToken}
          polling={telegramPolling}
          saving={saving}
          step={telegramStep}
          verifying={telegramVerifying}
          onBack={() => onSetTelegramStep(1)}
          onCancel={onCancelSetup}
          onDetectChat={onDetectTelegramChat}
          onTokenChange={onTelegramTokenChange}
          onVerify={onVerifyTelegramBot}
        />
      )}
    </div>
  );
}
