import { Bell, Loader2, MessageCircle, X } from 'lucide-react';
import { NotificationChannelCard } from '@/components/notification-settings/NotificationChannelCard';
import { NotificationLogPanel } from '@/components/notification-settings/NotificationLogPanel';
import { NotificationPreferencesPanel } from '@/components/notification-settings/NotificationPreferencesPanel';
import { useNotificationSettings } from '@/components/notification-settings/useNotificationSettings';
import { ChannelLogo } from '@/components/notification-settings/ChannelLogo';

export default function NotificationSettings() {
  const {
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
    setShowLog,
    setTelegramBotToken,
    setTelegramStep,
    setWebhookUrl,
    handleCancelSetup,
    handleDetectTelegramChat,
    handleDisconnect,
    handleSaveWebhook,
    handleStartSetup,
    handleTest,
    handleToggleChannel,
    handleUpdatePreference,
    handleVerifyTelegramBot,
  } = useNotificationSettings();

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
          <span style={{ color: 'var(--text-muted)' }}>
            Loading notification settings...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in">
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
            style={{ backgroundColor: 'var(--accent-red)15', color: 'var(--accent-red-text)' }}
          >
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Dismiss error">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="label mb-3">Channels</div>
        <div className="space-y-3">
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: 'var(--brand-primary)20',
                    color: 'var(--brand-text)',
                  }}
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
                      style={{
                        backgroundColor: 'var(--accent-green)20',
                        color: 'var(--brand-text)',
                      }}
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

          {(['telegram', 'discord', 'slack'] as const).map((type) => (
            <NotificationChannelCard
              key={type}
              channel={getChannelConfig(type)}
              isConnected={isChannelConnected(type)}
              isSettingUp={setupChannel === type}
              saving={saving}
              telegramBotName={telegramBotName}
              telegramBotToken={telegramBotToken}
              telegramPolling={telegramPolling}
              telegramStep={telegramStep}
              telegramVerifying={telegramVerifying}
              testResult={testResult}
              testing={testing}
              type={type}
              webhookUrl={webhookUrl}
              onCancelSetup={handleCancelSetup}
              onDetectTelegramChat={handleDetectTelegramChat}
              onDisconnect={() => void handleDisconnect(type)}
              onSaveWebhook={() => void handleSaveWebhook(type)}
              onSetTelegramStep={setTelegramStep}
              onStartSetup={() => handleStartSetup(type)}
              onTelegramTokenChange={setTelegramBotToken}
              onTest={() => void handleTest(type)}
              onToggle={() => void handleToggleChannel(type)}
              onVerifyTelegramBot={handleVerifyTelegramBot}
              onWebhookUrlChange={setWebhookUrl}
            />
          ))}

          <div
            className="p-4 rounded-xl opacity-50"
            style={{ backgroundColor: 'var(--bg-hover)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ChannelLogo
                  domain="whatsapp.com"
                  icon={MessageCircle}
                  color="#25D366"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      WhatsApp
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: 'var(--bg-active)',
                        color: 'var(--text-muted)',
                      }}
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

        <div className="my-6" style={{ borderTop: '1px solid var(--border-default)' }} />

        <NotificationPreferencesPanel
          preferences={preferences}
          onUpdatePreference={(key, value) => void handleUpdatePreference(key, value)}
        />
      </div>

      <NotificationLogPanel
        entries={log}
        showLog={showLog}
        onToggle={() => setShowLog((previous) => !previous)}
      />
    </div>
  );
}
