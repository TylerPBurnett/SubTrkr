import { useState, useEffect, useRef, useMemo } from 'react';
import { X, AlertCircle, Receipt, CreditCard } from 'lucide-react';
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

  const validate = (): Partial<Record<keyof ItemFormData, string>> => {
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
    return newErrors;
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

    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      // Shake animation
      setShake(true);
      setTimeout(() => setShake(false), 500);
      
      // Focus first error field
      const firstErrorField = Object.keys(newErrors)[0];
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
        className={`zoom-in-95 relative w-full max-w-lg rounded-2xl shadow-xl max-h-[90vh] overflow-hidden ${shake ? 'animate-shake' : ''}`}
        style={{ backgroundColor: 'var(--bg-surface)' }}
      >
        {/* Colored header bar with shimmer */}
        <div className="relative h-2 shimmer" style={{
          background: 'linear-gradient(90deg, var(--brand-primary) 0%, #16a34a 100%)'
        }} />

        {/* Header */}
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div style={{
              background: 'linear-gradient(135deg, var(--brand-primary) 0%, #16a34a 100%)',
              boxShadow: '0 4px 14px -3px rgba(34, 197, 94, 0.35)'
            }} className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0">
              {itemType === 'bill' ? (
                <Receipt className="w-8 h-8 text-white" />
              ) : (
                <CreditCard className="w-8 h-8 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold" style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                {isEditing ? 'Edit' : 'Add'} {labels.singular}
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {isEditing ? 'Update your details' : 'Track a new recurring payment'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors shrink-0"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div style={{ height: '1px', backgroundColor: 'var(--border-default)' }} />

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
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
            <div className="stagger-item" style={{ animationDelay: '0.05s' }}>
              <label className="label block mb-1.5">
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
            <div className="stagger-item grid grid-cols-2 gap-4" style={{ animationDelay: '0.1s' }}>
              <div>
                <label className="label block mb-1.5">
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
                  className="input w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2"
                  style={{
                    borderColor: errors.amount ? 'var(--accent-red)' : 'var(--border-default)',
                    '--tw-ring-color': 'var(--brand-primary)',
                    fontSize: '1.5rem',
                    fontWeight: 600
                  } as React.CSSProperties}
                />
                {errors.amount && (
                  <p className="mt-1 text-sm" style={{ color: 'var(--accent-red)' }}>{errors.amount}</p>
                )}
              </div>

              <div>
                <label className="label block mb-1.5">
                  Currency
                </label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  className="input w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': 'var(--brand-primary)' } as React.CSSProperties}
                >
                  {currencies.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Billing Cycle & Category */}
            <div className="stagger-item grid grid-cols-2 gap-4" style={{ animationDelay: '0.15s' }}>
              <div>
                <label className="label block mb-1.5">
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
                <label className="label block mb-1.5">
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
            <div className="stagger-item grid grid-cols-2 gap-4" style={{ animationDelay: '0.2s' }}>
              <div>
                <label className="label block mb-1.5">
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
                <label className="label block mb-1.5">
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
            <div className="stagger-item" style={{ animationDelay: '0.25s' }}>
              <label className="label block mb-1.5">
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
            <div className="stagger-item" style={{ animationDelay: '0.3s' }}>
              <label className="label block mb-1.5">
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
            <div className="stagger-item" style={{ animationDelay: '0.35s' }}>
              <label className="label block mb-1.5">
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
