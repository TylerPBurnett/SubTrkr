import { Bell, Calendar as CalendarIcon, CircleDot, FileText, Link } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import type { ItemFormData } from '@/types';
import { formatDisplayDate } from '@/utils/dates';
import type { ItemFormVisualConfig } from './types';

interface ItemFormSecondaryFieldsProps {
  config: ItemFormVisualConfig;
  formData: ItemFormData;
  isEditing: boolean;
  onFieldChange: (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => void;
  onReminderDaysChange: (reminderDays: number) => void;
  onStatusChange: (status: 'active' | 'trial') => void;
  onTrialEndDateChange: (date: string) => void;
  showMore: boolean;
  today: string;
  trialEndError?: string;
  urlError?: string;
}

export function ItemFormSecondaryFields({
  config,
  formData,
  isEditing,
  onFieldChange,
  onReminderDaysChange,
  onStatusChange,
  onTrialEndDateChange,
  showMore,
  today,
  trialEndError,
  urlError,
}: ItemFormSecondaryFieldsProps) {
  if (!showMore) {
    return null;
  }

  return (
    <div className="space-y-5 pt-1">
      {!isEditing && (
        <div className="item-form-field">
          <label
            className="item-form-label flex items-center gap-2 mb-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            <CircleDot className="w-3.5 h-3.5" />
            <span>Initial Status</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onStatusChange('active')}
              aria-pressed={formData.status === 'active'}
              className="p-3 rounded-xl text-xs font-semibold transition-all text-center"
              style={{
                backgroundColor:
                  formData.status === 'active'
                    ? 'var(--accent-green)'
                    : 'var(--bg-hover)',
                color:
                  formData.status === 'active'
                    ? 'white'
                    : 'var(--text-secondary)',
                border: `2px solid ${
                  formData.status === 'active'
                    ? 'var(--accent-green)'
                    : 'transparent'
                }`,
              }}
            >
              Active (Paid)
            </button>
            <button
              type="button"
              onClick={() => onStatusChange('trial')}
              aria-pressed={formData.status === 'trial'}
              className="p-3 rounded-xl text-xs font-semibold transition-all text-center"
              style={{
                backgroundColor:
                  formData.status === 'trial'
                    ? 'var(--accent-blue)'
                    : 'var(--bg-hover)',
                color:
                  formData.status === 'trial'
                    ? 'white'
                    : 'var(--text-secondary)',
                border: `2px solid ${
                  formData.status === 'trial'
                    ? 'var(--accent-blue)'
                    : 'transparent'
                }`,
              }}
            >
              Trial (Free)
            </button>
          </div>
        </div>
      )}

      {formData.status === 'trial' && (
        <div className="item-form-field">
          <label
            className="item-form-label flex items-center gap-2 mb-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Trial Ends</span>
            <span style={{ color: 'var(--brand-text)' }}>*</span>
          </label>
          <DatePicker
            id="item-trial-end-date"
            name="trial_end_date"
            value={formData.trial_end_date || ''}
            onChange={onTrialEndDateChange}
            min={today}
            side="top"
            error={Boolean(trialEndError)}
            placeholder="Select trial end date"
          />
          <p
            className="item-form-mono mt-2"
            style={{
              color: trialEndError ? '#ef4444' : 'var(--text-muted)',
              fontSize: '0.75rem',
            }}
          >
            {trialEndError
              ? trialEndError
              : formData.trial_end_date
                ? `Trial expires on ${formatDisplayDate(formData.trial_end_date)}`
                : 'Required so we can remind you before it converts.'}
          </p>
        </div>
      )}

      <div className="item-form-field">
        <label
          className="item-form-label flex items-center gap-2 mb-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Reminder</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { value: 0, label: 'None' },
            { value: 1, label: '1 Day' },
            { value: 3, label: '3 Days' },
            { value: 7, label: '1 Week' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onReminderDaysChange(option.value)}
              aria-pressed={formData.reminder_days === option.value}
              className="py-3 rounded-xl text-xs font-semibold transition-all"
              style={{
                background:
                  formData.reminder_days === option.value
                    ? 'var(--brand-primary)'
                    : 'var(--bg-hover)',
                color:
                  formData.reminder_days === option.value
                    ? config.contrastText
                    : 'var(--text-secondary)',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="item-form-field">
        <label
          htmlFor="item-url"
          className="item-form-label flex items-center gap-2 mb-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Link className="w-3.5 h-3.5" />
          <span>Website URL</span>
          <span
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.625rem',
              marginLeft: '4px',
            }}
          >
            OPTIONAL
          </span>
        </label>
        <input
          id="item-url"
          type="url"
          name="url"
          value={formData.url}
          onChange={onFieldChange}
          autoComplete="off"
          placeholder="https://example.com"
          aria-invalid={Boolean(urlError)}
          aria-describedby={urlError ? 'url-error' : undefined}
          className="item-form-input w-full px-4 py-3.5 rounded-xl focus:outline-none"
          style={{
            border: `2px solid ${urlError ? '#ef4444' : 'var(--border-default)'}`,
            background: 'var(--bg-default)',
            color: 'var(--text-primary)',
          }}
        />
        {urlError && (
          <p id="url-error" className="item-form-mono mt-2" style={{ color: '#ef4444', fontSize: '0.75rem' }}>
            {urlError}
          </p>
        )}
      </div>

      <div className="item-form-field">
        <label
          htmlFor="item-notes"
          className="item-form-label flex items-center gap-2 mb-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Notes</span>
          <span
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.625rem',
              marginLeft: '4px',
            }}
          >
            OPTIONAL
          </span>
        </label>
        <textarea
          id="item-notes"
          name="notes"
          value={formData.notes}
          onChange={onFieldChange}
          rows={3}
          placeholder="Additional context or details..."
          className="item-form-input w-full px-4 py-3.5 rounded-xl focus:outline-none resize-none"
          style={{
            border: '2px solid var(--border-default)',
            background: 'var(--bg-default)',
            color: 'var(--text-primary)',
          }}
        />
      </div>
    </div>
  );
}
