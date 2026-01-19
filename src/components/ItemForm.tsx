import { useState, useEffect, useRef, useMemo } from 'react';
import { X, AlertCircle } from 'lucide-react';
import type { Category, ItemWithCategory, BillingCycle, ItemFormData, ItemType } from '../types';
import { getNextFutureBillingDate, formatISODate, getToday } from '../utils/dates';

interface ItemFormProps {
  item?: ItemWithCategory | null;
  categories: Category[];
  itemType: ItemType;
  isSaving?: boolean;
  onSave: (data: {
    name: string;
    amount: number;
    currency: string;
    billing_cycle: BillingCycle;
    item_type: ItemType;
    category_id?: string;
    next_billing_date: string;
    start_date: string;
    notes?: string;
    url?: string;
    reminder_days?: number;
  }) => void;
  onClose: () => void;
}

const billingCycles: { value: BillingCycle; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];

export default function ItemForm({
  item,
  categories,
  itemType,
  isSaving = false,
  onSave,
  onClose,
}: ItemFormProps) {
  const isEditing = !!item;
  const today = formatISODate(getToday());
  
  // Get labels based on item type
  const labels = {
    singular: itemType === 'bill' ? 'Bill' : 'Subscription',
    namePlaceholder: itemType === 'bill' ? 'e.g., Electric, Rent, Insurance' : 'e.g., Netflix, Spotify',
  };

  // Filter categories by type
  const filteredCategories = useMemo(() => {
    return categories.filter(cat => cat.category_type === itemType);
  }, [categories, itemType]);

  const [formData, setFormData] = useState<ItemFormData>(() => {
    const defaultNextBilling = getNextFutureBillingDate(today, 'monthly');
    return {
      name: '',
      amount: '',
      currency: 'USD',
      billing_cycle: 'monthly',
      category_id: '',
      next_billing_date: defaultNextBilling,
      start_date: today,
      notes: '',
      url: '',
      reminder_days: 3,
      item_type: itemType,
    };
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ItemFormData, string>>>({});
  const [shake, setShake] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        amount: item.amount.toString(),
        currency: item.currency,
        billing_cycle: item.billing_cycle,
        category_id: item.category_id || '',
        next_billing_date: item.next_billing_date.split('T')[0],
        start_date: item.start_date.split('T')[0],
        notes: item.notes || '',
        url: item.url || '',
        reminder_days: item.reminder_days,
        item_type: item.item_type,
      });
    }
  }, [item]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ItemFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      newErrors.amount = 'Enter a valid amount';
    }

    if (!formData.next_billing_date) {
      newErrors.next_billing_date = 'Next billing date is required';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    if (formData.url && !isValidUrl(formData.url)) {
      newErrors.url = 'Enter a valid URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (str: string): boolean => {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      // Shake animation
      setShake(true);
      setTimeout(() => setShake(false), 500);
      
      // Focus first error field
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField && formRef.current) {
        const input = formRef.current.querySelector(`[name="${firstErrorField}"]`) as HTMLInputElement;
        input?.focus();
      }
      return;
    }

    onSave({
      name: formData.name.trim(),
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      billing_cycle: formData.billing_cycle,
      item_type: formData.item_type, // Use form data to preserve original type when editing
      category_id: formData.category_id || undefined,
      next_billing_date: formData.next_billing_date,
      start_date: formData.start_date,
      notes: formData.notes.trim() || undefined,
      url: formData.url.trim() || undefined,
      reminder_days: formData.reminder_days,
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    // Convert reminder_days to number since it's a numeric select
    const processedValue = name === 'reminder_days' ? Number(value) : value;
    
    setFormData(prev => {
      const updated = { ...prev, [name]: processedValue };
      
      // Recalculate next_billing_date when scheduling fields change
      if (name === 'start_date') {
        // User is correcting when they started → recalculate from new start_date
        updated.next_billing_date = getNextFutureBillingDate(
          updated.start_date,
          updated.billing_cycle
        );
      } else if (name === 'billing_cycle') {
        // User is switching plans → new cycle starts from today
        updated.next_billing_date = getNextFutureBillingDate(
          today,
          updated.billing_cycle as BillingCycle
        );
      }
      
      return updated;
    });
    
    if (errors[name as keyof ItemFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div 
        className={`relative w-full max-w-lg rounded-2xl shadow-xl max-h-[90vh] overflow-hidden ${shake ? 'animate-shake' : ''}`}
        style={{ backgroundColor: 'var(--bg-surface)' }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-6"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {isEditing ? `Edit ${labels.singular}` : `Add ${labels.singular}`}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Error summary */}
          {Object.keys(errors).length > 0 && (
            <div 
              className="mb-5 p-4 rounded-xl flex items-start gap-3"
              style={{ 
                backgroundColor: 'var(--accent-red-muted)', 
                border: '1px solid var(--accent-red)' 
              }}
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--accent-red)' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--accent-red)' }}>Please fix the following errors:</p>
                <ul className="mt-1 text-sm list-disc list-inside" style={{ color: 'var(--accent-red)' }}>
                  {Object.values(errors).filter(Boolean).map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <div className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                {labels.singular} Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={labels.namePlaceholder}
                className="input w-full px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2"
                style={{ 
                  borderColor: errors.name ? 'var(--accent-red)' : 'var(--border-default)',
                  '--tw-ring-color': 'var(--brand-primary)'
                } as React.CSSProperties}
              />
              {errors.name && (
                <p className="mt-1 text-sm" style={{ color: 'var(--accent-red)' }}>{errors.name}</p>
              )}
            </div>

            {/* Amount & Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Amount *
                </label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="input w-full px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2"
                  style={{ 
                    borderColor: errors.amount ? 'var(--accent-red)' : 'var(--border-default)',
                    '--tw-ring-color': 'var(--brand-primary)'
                  } as React.CSSProperties}
                />
                {errors.amount && (
                  <p className="mt-1 text-sm" style={{ color: 'var(--accent-red)' }}>{errors.amount}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Currency
                </label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  className="input w-full px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': 'var(--brand-primary)' } as React.CSSProperties}
                >
                  {currencies.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Billing Cycle & Category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Billing Cycle
                </label>
                <select
                  name="billing_cycle"
                  value={formData.billing_cycle}
                  onChange={handleChange}
                  className="input w-full px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': 'var(--brand-primary)' } as React.CSSProperties}
                >
                  {billingCycles.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Category
                </label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  className="input w-full px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': 'var(--brand-primary)' } as React.CSSProperties}
                >
                  <option value="">Select category</option>
                  {filteredCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Next Billing Date *
                </label>
                <input
                  type="date"
                  name="next_billing_date"
                  value={formData.next_billing_date}
                  onChange={handleChange}
                  className="input w-full px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2"
                  style={{ 
                    borderColor: errors.next_billing_date ? 'var(--accent-red)' : 'var(--border-default)',
                    '--tw-ring-color': 'var(--brand-primary)'
                  } as React.CSSProperties}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Start Date *
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className="input w-full px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2"
                  style={{ 
                    borderColor: errors.start_date ? 'var(--accent-red)' : 'var(--border-default)',
                    '--tw-ring-color': 'var(--brand-primary)'
                  } as React.CSSProperties}
                />
              </div>
            </div>

            {/* Reminder */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Remind me before (days)
              </label>
              <select
                name="reminder_days"
                value={formData.reminder_days}
                onChange={handleChange}
                className="input w-full px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': 'var(--brand-primary)' } as React.CSSProperties}
              >
                <option value={0}>Don't remind</option>
                <option value={1}>1 day</option>
                <option value={3}>3 days</option>
                <option value={7}>7 days</option>
              </select>
            </div>

            {/* URL */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Website URL
              </label>
              <input
                type="url"
                name="url"
                value={formData.url}
                onChange={handleChange}
                placeholder="https://..."
                className="input w-full px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2"
                style={{ 
                  borderColor: errors.url ? 'var(--accent-red)' : 'var(--border-default)',
                  '--tw-ring-color': 'var(--brand-primary)'
                } as React.CSSProperties}
              />
              {errors.url && (
                <p className="mt-1 text-sm" style={{ color: 'var(--accent-red)' }}>{errors.url}</p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Any additional notes..."
                className="input w-full px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 resize-none"
                style={{ '--tw-ring-color': 'var(--brand-primary)' } as React.CSSProperties}
              />
            </div>
          </div>

          {/* Actions */}
          <div 
            className="flex items-center gap-3 mt-6 pt-6"
            style={{ borderTop: '1px solid var(--border-default)' }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="btn-secondary flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary flex-1 px-4 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : `Add ${labels.singular}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
