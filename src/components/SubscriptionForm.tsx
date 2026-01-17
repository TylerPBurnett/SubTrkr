import { useState, useEffect, useRef } from 'react';
import { X, AlertCircle } from 'lucide-react';
import type { Category, SubscriptionWithCategory, BillingCycle, SubscriptionFormData } from '../types';

interface SubscriptionFormProps {
  subscription?: SubscriptionWithCategory | null;
  categories: Category[];
  onSave: (data: {
    name: string;
    amount: number;
    currency: string;
    billing_cycle: BillingCycle;
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

export default function SubscriptionForm({
  subscription,
  categories,
  onSave,
  onClose,
}: SubscriptionFormProps) {
  const isEditing = !!subscription;
  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState<SubscriptionFormData>({
    name: '',
    amount: '',
    currency: 'USD',
    billing_cycle: 'monthly',
    category_id: '',
    next_billing_date: today,
    start_date: today,
    notes: '',
    url: '',
    reminder_days: 3,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof SubscriptionFormData, string>>>({});
  const [shake, setShake] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (subscription) {
      setFormData({
        name: subscription.name,
        amount: subscription.amount.toString(),
        currency: subscription.currency,
        billing_cycle: subscription.billing_cycle,
        category_id: subscription.category_id || '',
        next_billing_date: subscription.next_billing_date.split('T')[0],
        start_date: subscription.start_date.split('T')[0],
        notes: subscription.notes || '',
        url: subscription.url || '',
        reminder_days: subscription.reminder_days,
      });
    }
  }, [subscription]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof SubscriptionFormData, string>> = {};

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
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof SubscriptionFormData]) {
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
      <div className={`relative w-full max-w-lg bg-white dark:bg-surface-800 rounded-2xl shadow-xl max-h-[90vh] overflow-hidden ${shake ? 'animate-shake' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
            {isEditing ? 'Edit Subscription' : 'Add Subscription'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Error summary */}
          {Object.keys(errors).length > 0 && (
            <div className="mb-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-300">Please fix the following errors:</p>
                <ul className="mt-1 text-sm text-red-600 dark:text-red-400 list-disc list-inside">
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
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Subscription Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Netflix, Spotify"
                className={`w-full px-4 py-2.5 bg-white dark:bg-surface-900 border rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                  errors.name ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-700'
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            {/* Amount & Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
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
                  className={`w-full px-4 py-2.5 bg-white dark:bg-surface-900 border rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                    errors.amount ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-700'
                  }`}
                />
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-500">{errors.amount}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Currency
                </label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-white dark:bg-surface-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Billing Cycle
                </label>
                <select
                  name="billing_cycle"
                  value={formData.billing_cycle}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-white dark:bg-surface-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {billingCycles.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Category
                </label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-white dark:bg-surface-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Next Billing Date *
                </label>
                <input
                  type="date"
                  name="next_billing_date"
                  value={formData.next_billing_date}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 bg-white dark:bg-surface-900 border rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                    errors.next_billing_date ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-700'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Start Date *
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 bg-white dark:bg-surface-900 border rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                    errors.start_date ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-700'
                  }`}
                />
              </div>
            </div>

            {/* Reminder */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Remind me before (days)
              </label>
              <select
                name="reminder_days"
                value={formData.reminder_days}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white dark:bg-surface-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value={0}>Don't remind</option>
                <option value={1}>1 day</option>
                <option value={3}>3 days</option>
                <option value={7}>7 days</option>
              </select>
            </div>

            {/* URL */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Website URL
              </label>
              <input
                type="url"
                name="url"
                value={formData.url}
                onChange={handleChange}
                placeholder="https://..."
                className={`w-full px-4 py-2.5 bg-white dark:bg-surface-900 border rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                  errors.url ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-700'
                }`}
              />
              {errors.url && (
                <p className="mt-1 text-sm text-red-500">{errors.url}</p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Any additional notes..."
                className="w-full px-4 py-2.5 bg-white dark:bg-surface-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl font-medium hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium shadow-lg shadow-brand-500/25 transition-all"
            >
              {isEditing ? 'Save Changes' : 'Add Subscription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
