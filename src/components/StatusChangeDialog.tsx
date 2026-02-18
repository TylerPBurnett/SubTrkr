import { useState, useRef, useEffect } from 'react';
import { X, AlertCircle, Pause, Play, XCircle, RotateCcw, Calendar, Check } from 'lucide-react';
import { addDays } from 'date-fns';
import type { ItemWithCategory, StatusChangeData } from '@/types';
import { formatISODate, getToday, formatDisplayDate } from '../utils/dates';

interface StatusChangeDialogProps {
  isOpen: boolean;
  item: ItemWithCategory;
  action: 'pause' | 'cancel' | 'resume' | 'reactivate' | 'convert';
  onConfirm: (data: StatusChangeData) => Promise<void>;
  onCancel: () => void;
}

export default function StatusChangeDialog({
  isOpen,
  item,
  action,
  onConfirm,
  onCancel,
}: StatusChangeDialogProps) {
  const today = formatISODate(getToday());
  const itemStartDate = item.start_date.split('T')[0];

  const [pausedOn, setPausedOn] = useState(today);
  const [cancelledOn, setCancelledOn] = useState(today);
  const [resumedOn, setResumedOn] = useState(today);
  const [convertedOn, setConvertedOn] = useState(today);
  const [pauseUntil, setPauseUntil] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const config = {
    pause: {
      icon: Pause,
      verb: 'Pause',
      title: 'Pause Subscription',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      glowColor: 'rgba(245, 158, 11, 0.3)',
      textColor: '#f59e0b',
      message: 'Subscription paused. Spending analytics adjusted from your specified date.',
    },
    cancel: {
      icon: XCircle,
      verb: 'Cancel',
      title: 'Cancel Subscription',
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      glowColor: 'rgba(239, 68, 68, 0.3)',
      textColor: '#ef4444',
      message: 'Subscription cancelled. Historical data preserved for accurate analytics.',
    },
    resume: {
      icon: Play,
      verb: 'Resume',
      title: 'Resume Subscription',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      glowColor: 'rgba(59, 130, 246, 0.3)',
      textColor: '#3b82f6',
      message: 'Billing resumes. Next payment recalculated from your specified date.',
    },
    reactivate: {
      icon: RotateCcw,
      verb: 'Reactivate',
      title: 'Reactivate Subscription',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      glowColor: 'rgba(16, 185, 129, 0.3)',
      textColor: '#10b981',
      message: 'Subscription reactivated. Billing cycle reinitiated from your specified date.',
    },
    convert: {
      icon: Check,
      verb: 'Convert',
      title: 'Convert Trial to Paid',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      glowColor: 'rgba(16, 185, 129, 0.3)',
      textColor: '#10b981',
      message: 'Trial converted to paid subscription. Billing starts from your specified date.',
    },
  };

  const currentConfig = config[action];
  const Icon = currentConfig.icon;

  const validate = (): string[] => {
    const newErrors: string[] = [];

    if (action === 'pause') {
      if (pausedOn < itemStartDate) {
        newErrors.push('Paused date cannot be before subscription start');
      }
      if (pausedOn > today) {
        newErrors.push('Paused date cannot be in the future');
      }
      if (pauseUntil && pauseUntil <= pausedOn) {
        newErrors.push('Resume date must be after pause date');
      }
    }

    if (action === 'cancel') {
      if (cancelledOn < itemStartDate) {
        newErrors.push('Cancellation date cannot be before subscription start');
      }
      if (cancelledOn > today) {
        newErrors.push('Cancellation date cannot be in the future');
      }
    }

    if (action === 'resume' || action === 'reactivate') {
      if (resumedOn < itemStartDate) {
        newErrors.push('Resume date cannot be before subscription start');
      }
      if (resumedOn > today) {
        newErrors.push('Resume date cannot be in the future');
      }
    }

    if (action === 'convert') {
      if (convertedOn < itemStartDate) {
        newErrors.push('Conversion date cannot be before subscription start');
      }
      if (convertedOn > today) {
        newErrors.push('Conversion date cannot be in the future');
      }
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
        data.pausedOn = pausedOn;
        if (pauseUntil) data.pauseUntil = pauseUntil;
      } else if (action === 'cancel') {
        data.cancelledOn = cancelledOn;
      } else if (action === 'resume' || action === 'reactivate') {
        data.resumedOn = resumedOn;
      } else if (action === 'convert') {
        data.convertedOn = convertedOn;
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
          font-family: 'Archivo', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .status-dialog-header {
          font-family: 'Archivo', sans-serif;
          font-weight: 800;
          letter-spacing: -0.03em;
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

        .status-dialog-input:focus {
          transform: translateY(-1px);
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
          font-family: 'Archivo', sans-serif;
          font-weight: 700;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          font-size: 0.8125rem;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .status-dialog-button:active:not(:disabled) {
          transform: scale(0.98);
        }

        .status-dialog-processing {
          animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .status-dialog-label {
          font-family: 'Archivo', sans-serif;
          font-weight: 600;
          font-size: 0.6875rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .status-dialog-hero {
          position: relative;
          overflow: hidden;
        }

        .status-dialog-hero::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          animation: shimmer 3s infinite;
        }

        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 200%; }
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 status-dialog-backdrop">
        <div
          className="absolute inset-0 backdrop-blur-md"
          style={{
            background: 'radial-gradient(circle at center, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7))',
          }}
          onClick={onCancel}
        />

        <div
          className={`relative w-full max-w-lg status-dialog-modal ${shake ? 'status-dialog-shake' : ''}`}
          style={{
            background: 'var(--bg-surface)',
            boxShadow: `
              0 0 0 1px rgba(0, 0, 0, 0.1),
              0 20px 60px -10px ${currentConfig.glowColor},
              0 40px 100px -20px rgba(0, 0, 0, 0.4)
            `,
            borderRadius: '20px',
            overflow: 'hidden',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Colored header bar */}
          <div
            className="status-dialog-hero"
            style={{
              background: currentConfig.gradient,
              height: '6px',
            }}
          />

          {/* Header */}
          <div className="px-8 pt-8 pb-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div
                  style={{
                    background: currentConfig.gradient,
                    boxShadow: `0 8px 24px ${currentConfig.glowColor}`,
                    borderRadius: '14px',
                    padding: '14px',
                  }}
                >
                  <Icon className="w-7 h-7" style={{ color: 'white', strokeWidth: 2.5 }} />
                </div>
                <div>
                  <h2
                    className="status-dialog-header"
                    style={{
                      fontSize: '1.75rem',
                      color: 'var(--text-primary)',
                      lineHeight: 1.1,
                    }}
                  >
                    {currentConfig.verb}
                  </h2>
                  <p
                    className="status-dialog-mono mt-1"
                    style={{
                      color: currentConfig.textColor,
                      fontWeight: 600,
                    }}
                  >
                    {item.name}
                  </p>
                </div>
              </div>

              <button
                onClick={onCancel}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {item.category && (
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
                    background: item.category.color,
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
                  {item.category.name}
                </span>
              </div>
            )}
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
                background: `linear-gradient(135deg, ${currentConfig.glowColor}, transparent)`,
                border: `1px solid ${currentConfig.textColor}20`,
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
                    <span>Paused On</span>
                    <span style={{ color: currentConfig.textColor }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={pausedOn}
                    onChange={(e) => setPausedOn(e.target.value)}
                    min={itemStartDate}
                    max={today}
                    className="status-dialog-input status-dialog-date-input w-full px-4 py-3.5 rounded-xl focus:outline-none"
                    style={{
                      border: `2px solid ${errors.length > 0 ? '#ef4444' : 'var(--border-default)'}`,
                      background: 'var(--bg-default)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <p className="status-dialog-mono mt-2" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    Actual pause date → affects analytics from {formatDisplayDate(pausedOn)}
                  </p>
                </div>

                <div className="mb-5 status-dialog-field">
                  <label className="status-dialog-label flex items-center gap-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Auto-Resume Date</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.625rem', marginLeft: '4px' }}>OPTIONAL</span>
                  </label>
                  <input
                    type="date"
                    value={pauseUntil}
                    onChange={(e) => setPauseUntil(e.target.value)}
                    min={formatISODate(addDays(new Date(pausedOn), 1))}
                    className="status-dialog-input status-dialog-date-input w-full px-4 py-3.5 rounded-xl focus:outline-none"
                    style={{
                      border: '2px solid var(--border-default)',
                      background: 'var(--bg-default)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <p className="status-dialog-mono mt-2" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {pauseUntil ? `Subscription resumes automatically on ${formatDisplayDate(pauseUntil)}` : 'Leave empty for indefinite pause'}
                  </p>
                </div>
              </>
            )}

            {action === 'cancel' && (
              <div className="mb-5 status-dialog-field">
                <label className="status-dialog-label flex items-center gap-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Cancelled On</span>
                  <span style={{ color: currentConfig.textColor }}>*</span>
                </label>
                <input
                  type="date"
                  value={cancelledOn}
                  onChange={(e) => setCancelledOn(e.target.value)}
                  min={itemStartDate}
                  max={today}
                  className="status-dialog-input status-dialog-date-input w-full px-4 py-3.5 rounded-xl focus:outline-none"
                  style={{
                    border: `2px solid ${errors.length > 0 ? '#ef4444' : 'var(--border-default)'}`,
                    background: 'var(--bg-default)',
                    color: 'var(--text-primary)',
                  }}
                />
                <p className="status-dialog-mono mt-2" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  Actual cancellation date → analytics exclude spending from {formatDisplayDate(cancelledOn)}
                </p>
              </div>
            )}

            {(action === 'resume' || action === 'reactivate') && (
              <div className="mb-5 status-dialog-field">
                <label className="status-dialog-label flex items-center gap-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Resumed On</span>
                  <span style={{ color: currentConfig.textColor }}>*</span>
                </label>
                <input
                  type="date"
                  value={resumedOn}
                  onChange={(e) => setResumedOn(e.target.value)}
                  min={itemStartDate}
                  max={today}
                  className="status-dialog-input status-dialog-date-input w-full px-4 py-3.5 rounded-xl focus:outline-none"
                  style={{
                    border: `2px solid ${errors.length > 0 ? '#ef4444' : 'var(--border-default)'}`,
                    background: 'var(--bg-default)',
                    color: 'var(--text-primary)',
                  }}
                />
                <p className="status-dialog-mono mt-2" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  Actual resume date → billing recalculates from {formatDisplayDate(resumedOn)}
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
                  min={itemStartDate}
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

            {/* Reason */}
            <div className="mb-5 status-dialog-field">
              <label className="status-dialog-label mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                Reason
                <span style={{ color: 'var(--text-muted)', fontSize: '0.625rem', marginLeft: '6px' }}>OPTIONAL</span>
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
                <span style={{ color: 'var(--text-muted)', fontSize: '0.625rem', marginLeft: '6px' }}>OPTIONAL</span>
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
                  background: currentConfig.gradient,
                  color: 'white',
                  border: 'none',
                  boxShadow: `0 4px 16px ${currentConfig.glowColor}`,
                  opacity: isSubmitting ? 0.7 : 1,
                }}
              >
                {isSubmitting ? 'Processing...' : `Confirm ${currentConfig.verb}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
