import { Globe } from 'lucide-react';
import type { NotificationPreferences } from '@/types';
import { getDetectedTimezone } from '@/services/notificationChannels';
import { TIMEZONES } from './constants';

interface NotificationPreferencesPanelProps {
  preferences: NotificationPreferences | null;
  onUpdatePreference: (key: string, value: unknown) => void;
}

export function NotificationPreferencesPanel({
  preferences,
  onUpdatePreference,
}: NotificationPreferencesPanelProps) {
  // The static list cannot cover every IANA zone, so make sure whatever is
  // stored (or detected before the first row is written) is always selectable.
  const currentTimezone = preferences?.timezone ?? getDetectedTimezone();
  const timezoneOptions = TIMEZONES.includes(currentTimezone)
    ? TIMEZONES
    : [currentTimezone, ...TIMEZONES];

  return (
    <>
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
            onChange={(event) =>
              onUpdatePreference(
                'default_reminder_days',
                parseInt(event.target.value, 10) || 3,
              )
            }
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
            value={currentTimezone}
            onChange={(event) => onUpdatePreference('timezone', event.target.value)}
            className="input px-3 py-2 rounded-lg text-sm"
          >
            {timezoneOptions.map((timezone) => (
              <option key={timezone} value={timezone}>
                {timezone.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Used for server-side notification delivery timing
          </p>
        </div>
      </div>
    </>
  );
}
