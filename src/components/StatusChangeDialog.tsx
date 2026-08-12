import { useState, useRef, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, AlertCircle, Pause, Play, XCircle, RotateCcw, Calendar, Check, Archive, Clock3 } from 'lucide-react';
import { addDays } from 'date-fns';
import type { Category, ItemWithCategory, StatusChangeData } from '@/types';
import { formatISODate, getToday, formatDisplayDate } from '../utils/dates';
import { getStatusActionButtonStyle } from './statusActionStyles';
import { getBatchMinimumEffectiveDate } from '@/services/database/lifecycle';

interface StatusChangeDialogProps {
  categories: Category[];
  isOpen: boolean;
  item: ItemWithCategory;
  action: StatusChangeData['action'];
  onConfirm: (data: StatusChangeData) => Promise<void>;
  onCancel: () => void;
  /** When present the dialog is in bulk mode and `item` is the first of the batch. */
  bulkItems?: ItemWithCategory[];
  /** Selected items that are ineligible for this action, reported in the header. */
  skippedCount?: number;
}

export default function StatusChangeDialog({
  categories,
  isOpen,
  item,
  action,
  onConfirm,
  onCancel,
  bulkItems,
  skippedCount,
}: StatusChangeDialogProps) {
  const today = formatISODate(getToday());
  const itemStartDate = item.start_date.split('T')[0];
  const minimumAutoResumeDate = formatISODate(addDays(getToday(), 1));
  const effectiveItems = bulkItems && bulkItems.length > 0 ? bulkItems : [item];

  const [cancelledOn, setCancelledOn] = useState(today);
  const [resumedOn, setResumedOn] = useState(today);
  const [convertedOn, setConvertedOn] = useState(today);
  const [trialEndDate, setTrialEndDate] = useState(formatISODate(addDays(getToday(), 14)));
  const [pauseUntil, setPauseUntil] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const itemCategory = categories.find((category) => category.id === item.category_id);

  // Bulk mode is the only case where `item` is a stand-in for a whole batch.
  // Everything keyed off `isBulk` below swaps the single-item identity block
  // (name + category chip, both of which would name only the first item) for a
  // count-led header. Presence of `bulkItems` is the gate, not its length: a
  // bulk action that narrowed to a single eligible item still has to disclose
  // the ones it is skipping, and gating on `> 1` silently dropped that warning.
  // The per-item flow from the row menu passes no `bulkItems` at all, so it is
  // untouched.
  const isBulk = Boolean(bulkItems && bulkItems.length > 0);
  const bulkCount = bulkItems?.length ?? 0;
  const bulkTypeLabel = (() => {
    if (!bulkItems || bulkItems.length === 0) return 'items';

    const firstType = bulkItems[0].item_type;
    const isUniform = bulkItems.every((entry) => entry.item_type === firstType);
    if (!isUniform) return bulkCount === 1 ? 'item' : 'items';

    if (bulkCount === 1) return firstType === 'bill' ? 'bill' : 'subscription';

    return firstType === 'bill' ? 'bills' : 'subscriptions';
  })();

  const clampDate = (value: string, minimum: string): string => (value < minimum ? minimum : value);

  // The floor for date validation. In single-item mode (the default —
  // bulkItems absent or too short) this collapses to exactly the per-item
  // minimum getMinimumEffectiveDate would have returned for `item` alone.
  // In bulk mode it's the latest of every batch member's own floor, so a
  // date valid for one item can't be invalid for another in the same batch.
  const minimumEffectiveDate = getBatchMinimumEffectiveDate(effectiveItems, action) ?? itemStartDate;
  const archiveRecordedOn = formatDisplayDate(today);
  const defaultTrialEndDate = formatISODate(addDays(getToday(), 14));

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    setErrors([]);
    setReason('');
    setNotes('');
    setPauseUntil('');

    switch (action) {
      case 'cancel':
        setCancelledOn(clampDate(today, minimumEffectiveDate));
        break;
      case 'edit_cancellation':
        setCancelledOn(clampDate(item.cancellation_date || today, minimumEffectiveDate));
        break;
      case 'resume':
        setResumedOn(clampDate(today, minimumEffectiveDate));
        break;
      case 'reactivate':
        setResumedOn(clampDate(today, minimumEffectiveDate));
        break;
      case 'convert':
        setConvertedOn(clampDate(today, minimumEffectiveDate));
        break;
      case 'start_trial':
        setTrialEndDate(item.trial_end_date || defaultTrialEndDate);
        break;
      case 'archive':
        break;
    }
  }, [
    action,
    isOpen,
    minimumEffectiveDate,
    today,
    item.cancellation_date,
    item.trial_end_date,
    defaultTrialEndDate,
  ]);

  if (!isOpen) return null;

  // `accentColor` paints the header icon and its background tint; `textColor`
  // prints the words. They diverge wherever the accent is a fill colour that
  // fails AA as text — otherwise the icon would darken along with the label.
  const config = {
    pause: {
      icon: Pause,
      verb: 'Pause',
      title: 'Pause Subscription',
      accentColor: 'var(--accent-amber)',
      textColor: 'var(--accent-amber-text)',
      message: 'Pause takes effect immediately. You can optionally set when recurring tracking should resume.',
    },
    cancel: {
      icon: XCircle,
      verb: 'Cancel',
      title: 'Cancel Subscription',
      accentColor: 'var(--accent-red)',
      textColor: 'var(--accent-red-text)',
      message: 'Subscription cancelled. Historical data preserved for accurate analytics.',
    },
    edit_cancellation: {
      icon: Calendar,
      verb: 'Edit',
      title: 'Edit Cancellation Date',
      accentColor: 'var(--accent-blue)',
      textColor: 'var(--accent-blue-text)',
      message: 'Update the effective cancellation date without fabricating a new cancellation event.',
    },
    resume: {
      icon: Play,
      verb: 'Resume',
      title: 'Resume Subscription',
      accentColor: 'var(--accent-blue)',
      textColor: 'var(--accent-blue-text)',
      message: 'Billing resumes while keeping the existing billing cadence whenever possible.',
    },
    reactivate: {
      icon: RotateCcw,
      verb: 'Reactivate',
      title: 'Reactivate Subscription',
      accentColor: 'var(--brand-primary)',
      textColor: 'var(--brand-text)',
      message: 'Subscription reactivated. Billing cycle reinitiated from your specified date.',
    },
    convert: {
      icon: Check,
      verb: 'Convert',
      title: 'Convert Trial to Paid',
      accentColor: 'var(--brand-primary)',
      textColor: 'var(--brand-text)',
      message: 'Trial converted to paid subscription. Billing starts from your specified date.',
    },
    archive: {
      icon: Archive,
      verb: 'Archive',
      title: 'Archive Item',
      accentColor: 'var(--text-secondary)',
      textColor: 'var(--text-secondary)',
      message: 'Archive the item while preserving its full status history and notes.',
    },
    start_trial: {
      icon: Clock3,
      verb: 'Start Trial',
      title: 'Start Trial',
      accentColor: 'var(--accent-purple)',
      textColor: 'var(--accent-purple-text)',
      message: 'Move the item into trial status and set when the trial should end.',
    },
  };

  const currentConfig = config[action];
  const Icon = currentConfig.icon;
  const actionButtonStyle = getStatusActionButtonStyle(action);

  const validate = (): string[] => {
    const newErrors: string[] = [];

    if (action === 'pause' && pauseUntil && pauseUntil <= today) {
      newErrors.push('Auto-resume date must be after today');
    }

    if (action === 'cancel') {
      if (cancelledOn < minimumEffectiveDate) {
        newErrors.push('Cancellation date cannot be before subscription start');
      }
      if (cancelledOn > today) {
        newErrors.push('Cancellation date cannot be in the future');
      }
    }

    if (action === 'edit_cancellation') {
      if (cancelledOn < minimumEffectiveDate) {
        newErrors.push('Cancellation date cannot be before subscription start');
      }
      if (cancelledOn > today) {
        newErrors.push('Cancellation date cannot be in the future');
      }
    }

    if (action === 'resume') {
      if (resumedOn < minimumEffectiveDate) {
        newErrors.push('Resume date cannot be before the item was paused');
      }
      if (resumedOn > today) {
        newErrors.push('Resume date cannot be in the future');
      }
    }

    if (action === 'reactivate') {
      if (resumedOn < minimumEffectiveDate) {
        newErrors.push('Reactivation date cannot be before the item was cancelled or archived');
      }
      if (resumedOn > today) {
        newErrors.push('Resume date cannot be in the future');
      }
    }

    if (action === 'convert') {
      if (convertedOn < minimumEffectiveDate) {
        newErrors.push('Conversion date cannot be before the trial started');
      }
      if (convertedOn > today) {
        newErrors.push('Conversion date cannot be in the future');
      }
    }

    if (action === 'start_trial' && trialEndDate < today) {
      newErrors.push('Trial end date cannot be in the past');
    }

    setErrors(newErrors);
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setIsSubmitting(true);

    try {
      const data: StatusChangeData = {
        action,
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (action === 'pause') {
        if (pauseUntil) data.pauseUntil = pauseUntil;
      } else if (action === 'cancel' || action === 'edit_cancellation') {
        data.cancelledOn = cancelledOn;
      } else if (action === 'resume' || action === 'reactivate') {
        data.resumedOn = resumedOn;
      } else if (action === 'convert') {
        data.convertedOn = convertedOn;
      } else if (action === 'start_trial') {
        data.trialEndDate = trialEndDate;
      }

      await onConfirm(data);
    } catch (error) {
      console.error('Status change failed:', error);
      setErrors(['Failed to update subscription. Please try again.']);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .status-dialog-backdrop {
          animation: fadeInScale 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .status-dialog-modal {
          animation: ${isVisible ? 'fadeInScale 0.3s cubic-bezier(0.16, 1, 0.3, 1)' : 'none'};
        }

        .status-dialog-header {
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .status-dialog-mono {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.8125rem;
          letter-spacing: -0.01em;
        }

        .status-dialog-field {
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) backwards;
        }

        .status-dialog-field:nth-child(1) { animation-delay: 0.05s; }
        .status-dialog-field:nth-child(2) { animation-delay: 0.1s; }
        .status-dialog-field:nth-child(3) { animation-delay: 0.15s; }
        .status-dialog-field:nth-child(4) { animation-delay: 0.2s; }
        .status-dialog-field:nth-child(5) { animation-delay: 0.25s; }

        .status-dialog-shake {
          animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97);
        }

        .status-dialog-input {
          font-family: 'JetBrains Mono', monospace;
          font-weight: 500;
          font-size: 0.9375rem;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .status-dialog-input:focus,
        .status-dialog-input:focus-visible {
          transform: translateY(-1px);
          outline: none !important;
          box-shadow: none !important;
          border-color: var(--brand-primary) !important;
        }

        .status-dialog-date-input::-webkit-calendar-picker-indicator {
          cursor: pointer;
          opacity: 0.6;
          transition: opacity 0.2s;
        }

        .status-dialog-date-input::-webkit-calendar-picker-indicator:hover {
          opacity: 1;
        }

        .status-dialog-button {
          font-weight: 600;
          font-size: 0.9375rem;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .status-dialog-button:active:not(:disabled) {
          transform: scale(0.98);
        }

        .status-dialog-processing {
          animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .status-dialog-label {
          font-weight: 500;
          font-size: 0.8125rem;
          color: var(--text-secondary);
        }

      `}</style>

      <Dialog.Root
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onCancel();
        }}
      >
        <Dialog.Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 status-dialog-backdrop">
            <Dialog.Overlay
              className="absolute inset-0 backdrop-blur-md"
              style={{
                background: 'radial-gradient(circle at center, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7))',
              }}
            />

            <Dialog.Content
              aria-modal="true"
              className={`relative w-full max-w-lg status-dialog-modal ${shake ? 'status-dialog-shake' : ''}`}
              style={{
                background: 'var(--bg-surface)',
                boxShadow: 'var(--shadow-floating)',
                borderRadius: '20px',
                overflow: 'hidden',
                maxHeight: '92vh',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Header */}
              <div className="px-8 pt-8 pb-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      style={{
                        background: `color-mix(in srgb, ${currentConfig.accentColor} 14%, transparent)`,
                        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${currentConfig.accentColor} 24%, transparent)`,
                        borderRadius: '14px',
                        padding: '14px',
                        color: currentConfig.accentColor,
                      }}
                    >
                      <Icon className="w-7 h-7" style={{ strokeWidth: 2 }} />
                    </div>
                    <div>
                      <Dialog.Title
                        className="status-dialog-header"
                        style={{
                          fontSize: '1.75rem',
                          color: 'var(--text-primary)',
                          lineHeight: 1.1,
                        }}
                      >
                        {currentConfig.verb}
                      </Dialog.Title>
                      <Dialog.Description
                        className="status-dialog-mono mt-1"
                        style={{
                          color: currentConfig.textColor,
                          fontWeight: 600,
                        }}
                      >
                        {isBulk ? `${bulkCount} ${bulkTypeLabel}` : item.name}
                      </Dialog.Description>
                    </div>
                  </div>

                  <button
                    onClick={onCancel}
                    aria-label="Close dialog"
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {!isBulk && itemCategory && (
                  <div
                    className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
                    style={{
                      background: 'var(--bg-hover)',
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: itemCategory.color,
                      }}
                    />
                    <span
                      className="status-dialog-mono"
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        fontWeight: 600,
                      }}
                    >
                      {itemCategory.name}
                    </span>
                  </div>
                )}

                {/*
                  The batch count now lives in the header above, so this line
                  only has to carry the exception: the selected items this
                  action can't touch.
                */}
                {isBulk && (skippedCount ?? 0) > 0 ? (
                  <p className="text-sm mt-4" style={{ color: 'var(--text-secondary)' }}>
                    {skippedCount} selected {skippedCount === 1 ? 'item is' : 'items are'} not
                    eligible and will be skipped.
                  </p>
                ) : null}
              </div>

              <form ref={formRef} onSubmit={handleSubmit} className="px-8 pb-8 overflow-y-auto flex-1">
                {/* Error Banner */}
                {errors.length > 0 && (
                  <div
                    className="mb-6 p-4 rounded-2xl flex items-start gap-3"
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '2px solid #ef4444',
                    }}
                  >
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                    <div>
                      <p className="font-semibold text-sm" style={{ color: '#ef4444' }}>
                        Validation Error
                      </p>
                      <ul className="mt-1 text-sm space-y-1" style={{ color: '#ef4444' }}>
                        {errors.map((error, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span>•</span>
                            <span>{error}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Info Banner */}
                <div
                  className="mb-6 p-5 rounded-2xl status-dialog-field"
                  style={{
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--text-primary)', fontWeight: 500 }}
                  >
                    {currentConfig.message}
                  </p>
                </div>

                {/* Date Fields */}
                {action === 'pause' && (
                  <>
                    <div className="mb-5 status-dialog-field">
                      <label className="status-dialog-label flex items-center gap-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Auto-Resume Date</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.625rem', marginLeft: '4px' }}>Optional</span>
                      </label>
                      <input
                        type="date"
                        value={pauseUntil}
                        onChange={(e) => setPauseUntil(e.target.value)}
                        min={minimumAutoResumeDate}
                        className="status-dialog-input status-dialog-date-input w-full px-4 py-3.5 rounded-xl focus:outline-none"
                        style={{
                          border: '2px solid var(--border-default)',
                          background: 'var(--bg-default)',
                          color: 'var(--text-primary)',
                        }}
                      />
                      <p className="status-dialog-mono mt-2" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {pauseUntil ? `Subscription resumes automatically on ${formatDisplayDate(pauseUntil)}` : 'Leave empty for an indefinite pause'}
                      </p>
                    </div>
                  </>
                )}

                {(action === 'cancel' || action === 'edit_cancellation') && (
                  <div className="mb-5 status-dialog-field">
                    <label className="status-dialog-label flex items-center gap-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{action === 'edit_cancellation' ? 'Cancellation Date' : 'Cancelled On'}</span>
                      <span style={{ color: currentConfig.textColor }}>*</span>
                    </label>
                    <input
                      type="date"
                      value={cancelledOn}
                      onChange={(e) => setCancelledOn(e.target.value)}
                      min={minimumEffectiveDate}
                      max={today}
                      className="status-dialog-input status-dialog-date-input w-full px-4 py-3.5 rounded-xl focus:outline-none"
                      style={{
                        border: `2px solid ${errors.length > 0 ? '#ef4444' : 'var(--border-default)'}`,
                        background: 'var(--bg-default)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <p className="status-dialog-mono mt-2" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {action === 'edit_cancellation'
                        ? `Effective cancellation date now reads ${formatDisplayDate(cancelledOn)}`
                        : `Actual cancellation date → analytics exclude spending from ${formatDisplayDate(cancelledOn)}`}
                    </p>
                  </div>
                )}

                {(action === 'resume' || action === 'reactivate') && (
                  <div className="mb-5 status-dialog-field">
                    <label className="status-dialog-label flex items-center gap-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{action === 'reactivate' ? 'Reactivated On' : 'Resumed On'}</span>
                      <span style={{ color: currentConfig.textColor }}>*</span>
                    </label>
                    <input
                      type="date"
                      value={resumedOn}
                      onChange={(e) => setResumedOn(e.target.value)}
                      min={minimumEffectiveDate}
                      max={today}
                      className="status-dialog-input status-dialog-date-input w-full px-4 py-3.5 rounded-xl focus:outline-none"
                      style={{
                        border: `2px solid ${errors.length > 0 ? '#ef4444' : 'var(--border-default)'}`,
                        background: 'var(--bg-default)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <p className="status-dialog-mono mt-2" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {action === 'reactivate'
                        ? `Reactivation date → billing restarts from ${formatDisplayDate(resumedOn)}`
                        : 'Actual resume date → keep the current billing schedule unless a due date was missed while paused'}
                    </p>
                  </div>
                )}

                {action === 'convert' && (
                  <div className="mb-5 status-dialog-field">
                    <label className="status-dialog-label flex items-center gap-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Converted On</span>
                      <span style={{ color: currentConfig.textColor }}>*</span>
                    </label>
                    <input
                      type="date"
                      value={convertedOn}
                      onChange={(e) => setConvertedOn(e.target.value)}
                      min={minimumEffectiveDate}
                      max={today}
                      className="status-dialog-input status-dialog-date-input w-full px-4 py-3.5 rounded-xl focus:outline-none"
                      style={{
                        border: `2px solid ${errors.length > 0 ? '#ef4444' : 'var(--border-default)'}`,
                        background: 'var(--bg-default)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <p className="status-dialog-mono mt-2" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      Date when trial converted to paid → billing starts from {formatDisplayDate(convertedOn)}
                    </p>
                  </div>
                )}

                {action === 'start_trial' && (
                  <div className="mb-5 status-dialog-field">
                    <label className="status-dialog-label flex items-center gap-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Trial Ends On</span>
                      <span style={{ color: currentConfig.textColor }}>*</span>
                    </label>
                    <input
                      type="date"
                      value={trialEndDate}
                      onChange={(e) => setTrialEndDate(e.target.value)}
                      min={today}
                      className="status-dialog-input status-dialog-date-input w-full px-4 py-3.5 rounded-xl focus:outline-none"
                      style={{
                        border: `2px solid ${errors.length > 0 ? '#ef4444' : 'var(--border-default)'}`,
                        background: 'var(--bg-default)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <p className="status-dialog-mono mt-2" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      Trial starts immediately and ends on {formatDisplayDate(trialEndDate)}
                    </p>
                  </div>
                )}

                {action === 'archive' && (
                  <div className="mb-5 status-dialog-field">
                    <label className="status-dialog-label flex items-center gap-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Recorded On</span>
                    </label>
                    <div
                      className="status-dialog-input w-full px-4 py-3.5 rounded-xl"
                      style={{
                        border: '2px solid var(--border-default)',
                        background: 'var(--bg-default)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {archiveRecordedOn}
                    </div>
                    <p className="status-dialog-mono mt-2" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      Archive entries are recorded immediately and remain in status history.
                    </p>
                  </div>
                )}

                {action !== 'edit_cancellation' && (
                  <>
                    {/* Reason */}
                    <div className="mb-5 status-dialog-field">
                      <label className="status-dialog-label mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                        Reason
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.625rem', marginLeft: '6px' }}>Optional</span>
                      </label>
                      <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder={`e.g. Too expensive, Not using enough, Found alternative`}
                        className="status-dialog-input w-full px-4 py-3.5 rounded-xl focus:outline-none"
                        style={{
                          border: '2px solid var(--border-default)',
                          background: 'var(--bg-default)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>

                    {/* Notes */}
                    <div className="mb-6 status-dialog-field">
                      <label className="status-dialog-label mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                        Notes
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.625rem', marginLeft: '6px' }}>Optional</span>
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        placeholder="Additional context or details..."
                        className="status-dialog-input w-full px-4 py-3.5 rounded-xl focus:outline-none resize-none"
                        style={{
                          border: '2px solid var(--border-default)',
                          background: 'var(--bg-default)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>
                  </>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4" style={{ borderTop: '1px solid var(--border-default)' }}>
                  <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="status-dialog-button flex-1 px-5 py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      border: '2px solid var(--border-default)',
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`status-dialog-button flex-1 px-5 py-4 rounded-xl disabled:cursor-not-allowed ${isSubmitting ? 'status-dialog-processing' : ''}`}
                    style={{
                      ...actionButtonStyle,
                      opacity: isSubmitting ? 0.7 : 1,
                    }}
                  >
                    {isSubmitting ? 'Processing...' : `Confirm ${currentConfig.verb}`}
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
