import { ChevronDown, ChevronUp, Clock } from 'lucide-react';
import type { NotificationLogEntry } from '@/types';
import { CHANNEL_CONFIG } from './constants';
import { ChannelLogo } from './ChannelLogo';

interface NotificationLogPanelProps {
  entries: NotificationLogEntry[];
  showLog: boolean;
  onToggle: () => void;
}

export function NotificationLogPanel({
  entries,
  showLog,
  onToggle,
}: NotificationLogPanelProps) {
  return (
    <div className="card">
      <button onClick={onToggle} className="flex items-center justify-between w-full">
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
          {entries.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              No notifications sent yet.
            </p>
          ) : (
            entries.map((entry) => {
              const channelConfig = CHANNEL_CONFIG[entry.channel];
              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-2 rounded-lg text-sm"
                  style={{ backgroundColor: 'var(--bg-hover)' }}
                >
                  <div className="flex items-center gap-2">
                    <ChannelLogo
                      domain={channelConfig.domain}
                      icon={channelConfig.icon}
                      color={channelConfig.color}
                      size={24}
                    />
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
                            ? 'var(--accent-green)20'
                            : entry.status === 'failed'
                              ? 'var(--accent-red)20'
                              : 'var(--bg-active)',
                        color:
                          entry.status === 'sent'
                            ? 'var(--accent-green)'
                            : entry.status === 'failed'
                              ? 'var(--accent-red-text)'
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
  );
}
