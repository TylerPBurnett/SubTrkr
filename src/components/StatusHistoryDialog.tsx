import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Calendar, Clock3, History, X } from 'lucide-react';
import type { ItemStatus, ItemWithCategory, StatusHistory } from '@/types';
import { getStatusHistory } from '../services/database';
import { formatDisplayDate } from '../utils/dates';
import {
  getResolvedStatusHistoryAction,
  getResolvedStatusHistoryEffectiveDate,
  getResolvedStatusHistoryNotes,
} from '../utils/statusHistory';

interface StatusHistoryDialogProps {
  isOpen: boolean;
  item: ItemWithCategory;
  onClose: () => void;
}

const statusStyles: Record<ItemStatus, { bg: string; text: string; border: string }> = {
  active: {
    bg: 'var(--accent-green-muted)',
    text: 'var(--brand-text)',
    border: 'var(--accent-green)',
  },
  paused: {
    bg: 'var(--accent-amber-muted)',
    text: 'var(--accent-amber-text)',
    border: 'var(--accent-amber)',
  },
  cancelled: {
    bg: 'var(--accent-red-muted)',
    text: 'var(--accent-red-text)',
    border: 'var(--accent-red)',
  },
  archived: {
    bg: 'var(--bg-hover)',
    text: 'var(--text-muted)',
    border: 'var(--text-muted)',
  },
  trial: {
    bg: 'var(--accent-purple-muted)',
    text: 'var(--accent-purple-text)',
    border: 'var(--accent-purple)',
  },
};

const actionLabels: Record<string, string> = {
  pause: 'Paused',
  cancel: 'Cancelled',
  resume: 'Resumed',
  reactivate: 'Reactivated',
  archive: 'Archived',
  start_trial: 'Started Trial',
  edit_cancellation: 'Edited Cancellation Date',
  convert_trial: 'Converted to Paid',
  trial_expired: 'Trial Expired',
};

const statusLabels: Record<ItemStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  cancelled: 'Cancelled',
  archived: 'Archived',
  trial: 'Trial',
};

function getActionLabel(entry: StatusHistory): string {
  const action = getResolvedStatusHistoryAction(entry);
  if (action) {
    return actionLabels[action] || action.replace(/_/g, ' ');
  }

  return entry.status.charAt(0).toUpperCase() + entry.status.slice(1);
}

function formatRecordedAt(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return timestamp;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);
}

export default function StatusHistoryDialog({
  isOpen,
  item,
  onClose,
}: StatusHistoryDialogProps) {
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isCancelled = false;

    setIsLoading(true);
    setError(null);
    setHistory([]);

    getStatusHistory(item.id)
      .then((entries) => {
        if (!isCancelled) {
          setHistory(entries);
        }
      })
      .catch((loadError) => {
        if (!isCancelled) {
          console.error('Failed to load status history:', loadError);
          setError('Failed to load status history.');
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, item.id]);

  if (!isOpen) return null;

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <Dialog.Overlay
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          />

          <Dialog.Content
            aria-modal="true"
            className="relative w-full max-w-3xl rounded-3xl shadow-xl animate-in zoom-in-95 fade-in duration-200"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-strong)',
            }}
          >
            <button
              onClick={onClose}
              aria-label="Close status history"
              className="absolute top-5 right-5 p-2 rounded-xl transition-colors interactive-hover-bg"
              style={{ color: 'var(--text-muted)' }}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="px-8 pt-8 pb-6" style={{ borderBottom: '1px solid var(--border-default)' }}>
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'var(--bg-hover)',
                    color: 'var(--brand-primary)',
                  }}
                >
                  <History className="w-7 h-7" />
                </div>
                <div>
                  <p className="label mb-1">STATUS HISTORY</p>
                  <Dialog.Title asChild>
                    <h3
                      className="text-2xl"
                      style={{ color: 'var(--text-primary)', fontWeight: 700, letterSpacing: '-0.02em' }}
                    >
                      {item.name}
                    </h3>
                  </Dialog.Title>
                  <Dialog.Description style={{ color: 'var(--text-secondary)' }}>
                    Lifecycle actions, effective dates, and notes for this item.
                  </Dialog.Description>
                </div>
              </div>
            </div>

            <div className="px-8 py-6 max-h-[70vh] overflow-y-auto">
              {isLoading ? (
                <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
                  Loading history…
                </div>
              ) : error ? (
                <div
                  className="rounded-2xl p-4"
                  style={{
                    backgroundColor: 'var(--accent-red-muted)',
                    color: 'var(--accent-red-text)',
                  }}
                >
                  {error}
                </div>
              ) : history.length === 0 ? (
                <div className="py-16 text-center">
                  <History className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                  <p style={{ color: 'var(--text-secondary)' }}>No status history recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((entry) => {
                    const statusStyle = statusStyles[entry.status];
                    const effectiveDateRaw = getResolvedStatusHistoryEffectiveDate(entry);
                    const effectiveDate = effectiveDateRaw ? formatDisplayDate(effectiveDateRaw) : null;
                    const recordedAt = formatRecordedAt(entry.changed_at);
                    const notes = getResolvedStatusHistoryNotes(entry);

                    return (
                      <div
                        key={entry.id}
                        className="relative rounded-2xl p-5"
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-default)',
                        }}
                      >
                        <div
                          className="absolute left-0 top-5 bottom-5 w-1 rounded-full"
                          style={{ backgroundColor: statusStyle.border }}
                        />

                        <div className="ml-3 space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p
                                className="text-lg"
                                style={{
                                  color: 'var(--text-primary)',
                                  fontWeight: 700,
                                  letterSpacing: '-0.01em',
                                }}
                              >
                                {getActionLabel(entry)}
                              </p>
                              <div
                                className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold"
                                style={{
                                  backgroundColor: statusStyle.bg,
                                  color: statusStyle.text,
                                }}
                              >
                                {statusLabels[entry.status]}
                              </div>
                            </div>

                            <div className="text-right space-y-1">
                              {effectiveDate && (
                                <div className="flex items-center justify-end gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                  <Calendar className="w-4 h-4" />
                                  <span>Effective {effectiveDate}</span>
                                </div>
                              )}
                              <div className="flex items-center justify-end gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                                <Clock3 className="w-4 h-4" />
                                <span>Recorded {recordedAt}</span>
                              </div>
                            </div>
                          </div>

                          {entry.reason && (
                            <div>
                              <p className="label mb-1">Reason</p>
                              <p style={{ color: 'var(--text-primary)' }}>{entry.reason}</p>
                            </div>
                          )}

                          {notes && (
                            <div>
                              <p className="label mb-1">Notes</p>
                              <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                                {notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
