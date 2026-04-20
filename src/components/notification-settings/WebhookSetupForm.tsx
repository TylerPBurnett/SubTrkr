import { Check, Loader2 } from 'lucide-react';
import type { NotificationChannelType } from '@/types';

interface WebhookSetupFormProps {
  channelType: NotificationChannelType;
  color: string;
  saving: boolean;
  value: string;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
}

export function WebhookSetupForm({
  channelType,
  color,
  saving,
  value,
  onCancel,
  onChange,
  onSave,
}: WebhookSetupFormProps) {
  return (
    <div className="mt-3 space-y-2">
      <input
        type="url"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={
          channelType === 'discord'
            ? 'https://discord.com/api/webhooks/...'
            : 'https://hooks.slack.com/services/...'
        }
        className="input w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
        autoFocus
      />
      <div className="flex items-center gap-2">
        <button
          onClick={onSave}
          disabled={saving || !value.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          style={{ backgroundColor: color, color: 'white' }}
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          Save
        </button>
        <button
          onClick={onCancel}
          className="btn-secondary px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {channelType === 'discord'
          ? 'Go to Server Settings > Integrations > Webhooks in Discord to create a webhook URL.'
          : 'Go to your Slack workspace settings and create an Incoming Webhook app.'}
      </p>
    </div>
  );
}
