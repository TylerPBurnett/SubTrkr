import { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  AlertCircle,
  Receipt,
  CreditCard,
  Calendar as CalendarIcon,
  Tag,
  Bell,
  Link,
  FileText,
  Sparkles,
  ChevronDown,
  CircleDot,
  SlidersHorizontal
} from 'lucide-react';
import type { Category, ItemWithCategory, BillingCycle, ItemFormData, ItemType, ItemStatus } from '@/types';
import { getNextFutureBillingDate, formatISODate, getToday, formatDisplayDate } from '../utils/dates';
import ServiceAutocomplete from './ui/ServiceAutocomplete';
import ServiceLogo from './ui/ServiceLogo';
import { getServiceLogoUrl, type KnownService } from '../data/knownServices';
import { getLogoUrl } from '../config/logoApi';
import { DatePicker } from './ui/date-picker';

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
    logo_url?: string;
    reminder_days?: number;
    status?: ItemStatus;
    trial_end_date?: string;
  }) => void;
  onClose: () => void;
}

const billingCycles: { value: BillingCycle; label: string; short: string }[] = [
  { value: 'weekly', label: 'Weekly', short: '/wk' },
  { value: 'monthly', label: 'Monthly', short: '/mo' },
  { value: 'quarterly', label: 'Quarterly', short: '/qtr' },
  { value: 'yearly', label: 'Yearly', short: '/yr' },
];

const currencies = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'CAD', symbol: 'C$' },
  { code: 'AUD', symbol: 'A$' },
  { code: 'JPY', symbol: '¥' },
];

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

  const labels = {
    singular: itemType === 'bill' ? 'Bill' : 'Subscription',
    namePlaceholder: itemType === 'bill' ? 'e.g., Electric, Rent, Insurance' : 'e.g., Netflix, Spotify',
  };

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
      logo_url: '',
      reminder_days: 3,
      item_type: itemType,
      status: 'active',
      trial_end_date: '',
    };
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ItemFormData, string>>>({});
  const [shake, setShake] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hasServiceSelection, setHasServiceSelection] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10);
  }, []);

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
        logo_url: item.logo_url || '',
        reminder_days: item.reminder_days,
        item_type: item.item_type,
        status: item.status,
        trial_end_date: item.trial_end_date || '',
      });

      const hasMoreData =
        item.status === 'trial' ||
        item.reminder_days !== 3 ||
        Boolean(item.trial_end_date) ||
        Boolean(item.notes) ||
        Boolean(item.url);

      setShowMore(hasMoreData);
      setHasServiceSelection(Boolean(item.logo_url));
    } else {
      setShowMore(false);
      setHasServiceSelection(false);
    }
  }, [item]);

  const validate = (): Partial<Record<keyof ItemFormData, string>> => {
    const newErrors: Partial<Record<keyof ItemFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    const amountInput = formData.amount.trim();
    const amount = Number(amountInput);
    if (!amountInput || !Number.isFinite(amount)) {
      newErrors.amount = 'Enter a valid amount';
    } else if (amount < 0) {
      newErrors.amount = 'Amount cannot be negative';
    } else if (amount > 999999.99) {
      newErrors.amount = 'Amount cannot exceed $999,999.99';
    } else if (amount > 0 && amount < 0.01) {
      newErrors.amount = 'Amount must be at least $0.01';
    } else if (formData.status !== 'trial' && amount === 0) {
      newErrors.amount = 'Amount must be greater than 0 for paid subscriptions';
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
      setShake(true);
      setTimeout(() => setShake(false), 500);

      const firstErrorField = Object.keys(newErrors)[0];
      if (firstErrorField && formRef.current) {
        const input = formRef.current.querySelector(`[name="${firstErrorField}"]`) as HTMLInputElement;
        input?.focus();
      }
      return;
    }

    onSave({
      name: formData.name.trim(),
      amount: Math.round(parseFloat(formData.amount) * 100) / 100,
      currency: formData.currency,
      billing_cycle: formData.billing_cycle,
      item_type: formData.item_type,
      category_id: formData.category_id || undefined,
      next_billing_date: formData.next_billing_date,
      start_date: formData.start_date,
      notes: formData.notes.trim() || undefined,
      url: formData.url.trim() || undefined,
      logo_url: formData.logo_url || undefined,
      reminder_days: formData.reminder_days,
      status: formData.status,
      trial_end_date: formData.trial_end_date || undefined,
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const processedValue = name === 'reminder_days' ? Number(value) : value;

    setFormData(prev => {
      const updated = { ...prev, [name]: processedValue };

      if (name === 'start_date') {
        updated.next_billing_date = getNextFutureBillingDate(
          updated.start_date,
          updated.billing_cycle
        );
      } else if (name === 'billing_cycle') {
        updated.next_billing_date = getNextFutureBillingDate(
          today,
          updated.billing_cycle as BillingCycle
        );
      } else if (name === 'url' && !prev.logo_url) {
        try {
          const urlObj = new URL(value);
          const domain = urlObj.hostname.replace(/^www\./, '');
          updated.logo_url = getLogoUrl(domain);
        } catch {
          // Invalid URL, don't set logo
        }
      }

      return updated;
    });

    if (errors[name as keyof ItemFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleServiceSelect = (service: KnownService) => {
    const categoryMatch = filteredCategories.find(
      cat => cat.name.toLowerCase() === service.suggestedCategory?.toLowerCase()
    );

    setFormData(prev => ({
      ...prev,
      name: service.name,
      amount: service.defaultPrice.toString(),
      currency: service.defaultCurrency,
      billing_cycle: service.defaultBillingCycle,
      category_id: categoryMatch?.id || prev.category_id,
      logo_url: getServiceLogoUrl(service),
      url: `https://${service.domain}`,
    }));

    setHasServiceSelection(true);

    if (errors.name) {
      setErrors(prev => ({ ...prev, name: undefined }));
    }
  };

  const handleClearService = () => {
    if (hasServiceSelection) {
      // Full reset — clear all service-auto-filled fields
      setHasServiceSelection(false);
      setFormData(prev => ({
        ...prev,
        name: '',
        amount: '',
        currency: 'USD',
        billing_cycle: 'monthly',
        category_id: '',
        logo_url: '',
        url: '',
        next_billing_date: getNextFutureBillingDate(today, 'monthly'),
      }));
    } else {
      // Simple clear — just wipe the name
      setFormData(prev => ({ ...prev, name: '' }));
    }
  };

  const selectedCategory = filteredCategories.find(c => c.id === formData.category_id);
  const isBill = itemType === 'bill';

  // Gradient and glow config matching StatusChangeDialog's approach
  const config = {
    gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    glowColor: 'rgba(34, 197, 94, 0.3)',
    textColor: 'var(--brand-text)',
    contrastText: 'white',
  };

  return (
    <>
      <style>{`
        .item-form-modal {
          animation: ${isVisible ? 'itemFormFadeInScale 0.3s cubic-bezier(0.16, 1, 0.3, 1)' : 'none'};
          font-family: 'Archivo', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .item-form-header {
          font-family: 'Archivo', sans-serif;
          font-weight: 800;
          letter-spacing: -0.03em;
        }

        .item-form-mono {
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: -0.01em;
        }

        .item-form-label {
          font-family: 'Archivo', sans-serif;
          font-weight: 600;
          font-size: 0.6875rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .item-form-input,
        .item-form-input:focus,
        .item-form-input:focus-visible {
          font-family: 'JetBrains Mono', monospace;
          font-weight: 500;
          font-size: 0.9375rem;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          outline: none !important;
          box-shadow: none !important;
        }

        .item-form-input:focus {
          transform: translateY(-1px);
        }

        /* Hide number input spinners */
        .item-form-input[type="number"]::-webkit-inner-spin-button,
        .item-form-input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .item-form-input[type="number"] {
          -moz-appearance: textfield;
        }

        .item-form-button {
          font-family: 'Archivo', sans-serif;
          font-weight: 700;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          font-size: 0.8125rem;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .item-form-button:active:not(:disabled) {
          transform: scale(0.98);
        }

        .item-form-field {
          animation: itemFormSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) backwards;
        }

        .item-form-field:nth-child(1) { animation-delay: 0.05s; }
        .item-form-field:nth-child(2) { animation-delay: 0.1s; }
        .item-form-field:nth-child(3) { animation-delay: 0.15s; }
        .item-form-field:nth-child(4) { animation-delay: 0.2s; }
        .item-form-field:nth-child(5) { animation-delay: 0.25s; }
        .item-form-field:nth-child(6) { animation-delay: 0.3s; }
        .item-form-field:nth-child(7) { animation-delay: 0.35s; }

        .item-form-shake {
          animation: itemFormShake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97);
        }

        .item-form-processing {
          animation: itemFormPulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .item-form-hero {
          position: relative;
          overflow: hidden;
        }

        .item-form-hero::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          animation: itemFormShimmer 3s infinite;
        }

        @keyframes itemFormFadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes itemFormSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes itemFormShake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }

        @keyframes itemFormPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes itemFormShimmer {
          0% { left: -100%; }
          100% { left: 200%; }
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop - cinematic radial gradient like StatusChangeDialog */}
        <div
          className="absolute inset-0 backdrop-blur-md"
          style={{
            background: 'radial-gradient(circle at center, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7))',
          }}
          onClick={onClose}
        />

        {/* Modal */}
        <div
          className={`relative w-full max-w-lg item-form-modal ${shake ? 'item-form-shake' : ''}`}
          style={{
            background: 'var(--bg-surface)',
            boxShadow: `
              0 0 0 1px rgba(0, 0, 0, 0.1),
              0 20px 60px -10px ${config.glowColor},
              0 40px 100px -20px rgba(0, 0, 0, 0.4)
            `,
            borderRadius: '20px',
            overflow: 'hidden',
            maxHeight: '92vh',
          }}
        >
          {/* Gradient header bar */}
          <div
            className="item-form-hero"
            style={{
              background: config.gradient,
              height: '6px',
            }}
          />

          {/* Header */}
          <div className="px-8 pt-7 pb-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {/* Gradient icon badge */}
                <div
                  style={{
                    background: config.gradient,
                    boxShadow: `0 8px 24px ${config.glowColor}`,
                    borderRadius: '14px',
                    padding: '14px',
                  }}
                >
                  {isBill ? (
                    <Receipt className="w-7 h-7" style={{ color: 'white', strokeWidth: 2.5 }} />
                  ) : (
                    <CreditCard className="w-7 h-7" style={{ color: 'white', strokeWidth: 2.5 }} />
                  )}
                </div>
                <div>
                  <h2
                    className="item-form-header"
                    style={{
                      fontSize: '1.75rem',
                      color: 'var(--text-primary)',
                      lineHeight: 1.1,
                    }}
                  >
                    {isEditing ? 'Edit' : 'New'} {labels.singular}
                  </h2>
                  <p
                    className="item-form-mono mt-1"
                    style={{
                      color: 'var(--brand-text)',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                    }}
                  >
                    {isEditing ? 'Update payment details' : 'Track a recurring payment'}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                aria-label="Close form"
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form ref={formRef} onSubmit={handleSubmit} className="px-8 pb-8 overflow-y-auto max-h-[calc(92vh-140px)]">
            {/* Error Banner */}
            {Object.keys(errors).length > 0 && (
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
                    {Object.values(errors).filter(Boolean).map((error, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span>•</span>
                        <span>{error}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Preview Card — always visible with placeholder state */}
            <div
              className="mb-6 p-5 rounded-2xl item-form-field transition-all duration-300"
              style={{
                background: formData.name.trim()
                  ? `linear-gradient(135deg, ${config.glowColor}, transparent)`
                  : 'var(--bg-hover)',
                border: `1px solid ${formData.name.trim()
                  ? (isBill ? 'rgba(245, 158, 11, 0.2)' : 'rgba(34, 197, 94, 0.2)')
                  : 'var(--border-default)'}`,
                opacity: formData.name.trim() ? 1 : 0.7,
              }}
            >
              <div className="flex items-center gap-3">
                <div className="relative group">
                  <ServiceLogo
                    logoUrl={formData.logo_url || null}
                    name={formData.name || 'Service'}
                    size="md"
                    itemType={itemType}
                    categoryName={selectedCategory?.name}
                    categoryColor={selectedCategory?.color}
                  />
                  {formData.logo_url && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, logo_url: '' }))}
                      aria-label="Clear logo"
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      style={{
                        backgroundColor: 'var(--accent-red)',
                        color: 'white'
                      }}
                      title="Clear logo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-semibold text-base truncate"
                    style={{ color: formData.name.trim() ? 'var(--text-primary)' : 'var(--text-muted)' }}
                  >
                    {formData.name || `${labels.singular} name`}
                  </p>
                  <p className="item-form-mono" style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
                    {selectedCategory?.name || 'Category'} • {billingCycles.find(c => c.value === formData.billing_cycle)?.label || 'Monthly'}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className="item-form-mono"
                    style={{
                      fontWeight: 700,
                      color: formData.amount ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontSize: '1.125rem',
                    }}
                  >
                    {(currencies.find(c => c.code === formData.currency) || currencies[0]).symbol}
                    {(() => {
                      const num = parseFloat(formData.amount);
                      if (isNaN(num) || !formData.amount) return '0.00';
                      return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    })()}
                  </p>
                  <p className="item-form-mono" style={{ color: 'var(--text-muted)', fontSize: '0.6875rem', fontWeight: 600 }}>
                    {billingCycles.find(c => c.value === formData.billing_cycle)?.short || '/mo'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              {/* Service Name */}
              <div className="item-form-field">
                <label htmlFor="item-name" className="item-form-label flex items-center gap-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{labels.singular} Name</span>
                  <span style={{ color: 'var(--brand-text)' }}>*</span>
                </label>
                <ServiceAutocomplete
                  id="item-name"
                  value={formData.name}
                  itemType={itemType}
                  onChange={(value) => {
                    // Only reset service data when name is fully cleared
                    if (!value && hasServiceSelection) {
                      handleClearService();
                    } else {
                      setFormData(prev => ({ ...prev, name: value }));
                    }
                    if (errors.name) {
                      setErrors(prev => ({ ...prev, name: undefined }));
                    }
                  }}
                  onServiceSelect={handleServiceSelect}
                  onClear={handleClearService}
                  showClear={formData.name.length > 0}
                  placeholder={labels.namePlaceholder}
                  error={errors.name}
                  autoFocus={!isEditing}
                />
              </div>

              {/* Amount */}
              <div className="item-form-field">
                <label className="item-form-label flex items-center gap-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>Amount</span>
                  <span style={{ color: 'var(--brand-text)' }}>*</span>
                </label>
                {/* Unified currency + amount input */}
                <div
                  className="flex items-center rounded-xl overflow-hidden transition-all"
                  style={{
                    border: `2px solid ${errors.amount ? '#ef4444' : 'var(--border-default)'}`,
                    background: 'var(--bg-default)',
                  }}
                >
                  <select
                    id="item-currency"
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    aria-label="Currency"
                    className="item-form-input appearance-none pl-4 pr-1 py-3.5 cursor-pointer focus:outline-none"
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      width: 'auto',
                      minWidth: '60px',
                    }}
                  >
                    {currencies.map(c => (
                      <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
                    ))}
                  </select>
                  <div
                    className="w-px self-stretch my-2"
                    style={{ background: 'var(--border-default)' }}
                  />
                  <input
                    id="item-amount"
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                    min={formData.status === 'trial' ? '0' : '0.01'}
                    aria-label="Amount"
                    aria-invalid={Boolean(errors.amount)}
                    className="item-form-input flex-1 min-w-0 px-4 py-3.5 text-right focus:outline-none"
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      fontSize: '1.25rem',
                      fontWeight: 700,
                    }}
                  />
                </div>
                {errors.amount && (
                  <p className="item-form-mono mt-2" style={{ color: '#ef4444', fontSize: '0.75rem' }}>{errors.amount}</p>
                )}
                {!errors.amount && formData.status === 'trial' && (
                  <p className="item-form-mono mt-2" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    Trial subscriptions can use an amount of 0.
                  </p>
                )}
              </div>

              {/* Billing Cycle */}
              <div className="item-form-field">
                <label className="item-form-label flex items-center gap-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>Frequency</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {billingCycles.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          billing_cycle: value,
                          next_billing_date: getNextFutureBillingDate(today, value),
                        }));
                      }}
                      aria-pressed={formData.billing_cycle === value}
                      className="py-3 rounded-xl text-xs font-semibold transition-all"
                      style={{
                        background: formData.billing_cycle === value ? config.gradient : 'var(--bg-hover)',
                        color: formData.billing_cycle === value ? config.contrastText : 'var(--text-secondary)',
                        boxShadow: formData.billing_cycle === value ? `0 4px 12px ${config.glowColor}` : 'none',
                        fontFamily: "'Archivo', sans-serif",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div className="item-form-field">
                <label className="item-form-label flex items-center gap-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
                  <Tag className="w-3.5 h-3.5" />
                  <span>Category</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {filteredCategories.slice(0, 7).map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, category_id: prev.category_id === cat.id ? '' : cat.id }))}
                      aria-pressed={formData.category_id === cat.id}
                      className="p-2.5 rounded-xl text-xs font-semibold transition-all text-center truncate"
                      style={{
                        backgroundColor: formData.category_id === cat.id ? cat.color : 'var(--bg-hover)',
                        color: formData.category_id === cat.id ? 'white' : 'var(--text-secondary)',
                        border: `2px solid ${formData.category_id === cat.id ? cat.color : 'transparent'}`,
                        transform: formData.category_id === cat.id ? 'scale(1.01)' : 'scale(1)',
                        fontFamily: "'Archivo', sans-serif",
                      }}
                    >
                      {cat.name}
                    </button>
                  ))}
                  {filteredCategories.length > 7 && (
                    <select
                      value={filteredCategories.slice(7).some(c => c.id === formData.category_id) ? formData.category_id : ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                      aria-label="More categories"
                      className="p-2.5 rounded-xl text-xs font-semibold cursor-pointer"
                      style={{
                        backgroundColor: 'var(--bg-hover)',
                        border: '2px solid transparent',
                        color: 'var(--text-secondary)',
                        fontFamily: "'Archivo', sans-serif",
                      }}
                    >
                      <option value="">More...</option>
                      {filteredCategories.slice(7).map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="item-form-field grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="item-form-label flex items-center gap-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
                    <CalendarIcon className="w-3.5 h-3.5" />
                    <span>Start Date</span>
                    <span style={{ color: 'var(--brand-text)' }}>*</span>
                  </label>
                  <DatePicker
                    id="item-start-date"
                    value={formData.start_date}
                    onChange={(date) => {
                      setFormData(prev => ({
                        ...prev,
                        start_date: date,
                        next_billing_date: getNextFutureBillingDate(date, prev.billing_cycle),
                      }));
                      if (errors.start_date) {
                        setErrors(prev => ({ ...prev, start_date: undefined }));
                      }
                    }}
                    error={Boolean(errors.start_date)}
                    placeholder="Select start date"
                  />
                  {errors.start_date && (
                    <p id="start-date-error" className="item-form-mono mt-2" style={{ color: '#ef4444', fontSize: '0.75rem' }}>
                      {errors.start_date}
                    </p>
                  )}
                </div>

                <div>
                  <label className="item-form-label flex items-center gap-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
                    <CalendarIcon className="w-3.5 h-3.5" />
                    <span>Next Billing</span>
                    <span style={{ color: 'var(--brand-text)' }}>*</span>
                  </label>
                  <DatePicker
                    id="item-next-billing-date"
                    value={formData.next_billing_date}
                    onChange={(date) => {
                      setFormData(prev => ({ ...prev, next_billing_date: date }));
                      if (errors.next_billing_date) {
                        setErrors(prev => ({ ...prev, next_billing_date: undefined }));
                      }
                    }}
                    error={Boolean(errors.next_billing_date)}
                    placeholder="Select billing date"
                  />
                  {errors.next_billing_date && (
                    <p id="next-billing-date-error" className="item-form-mono mt-2" style={{ color: '#ef4444', fontSize: '0.75rem' }}>
                      {errors.next_billing_date}
                    </p>
                  )}
                  {!errors.next_billing_date && formData.next_billing_date && (
                    <p className="item-form-mono mt-2" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      Next charge on {formatDisplayDate(formData.next_billing_date)}
                    </p>
                  )}
                </div>
              </div>

              {/* More Options Toggle */}
              <button
                type="button"
                onClick={() => setShowMore(!showMore)}
                aria-expanded={showMore}
                className="item-form-field w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl transition-all"
                style={{
                  backgroundColor: 'var(--bg-hover)',
                  color: 'var(--text-secondary)',
                  fontFamily: "'Archivo', sans-serif",
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                }}
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
                  {showMore ? 'Hide' : 'More'} Options
                </span>
                <ChevronDown
                  className="w-4 h-4 transition-transform"
                  style={{ transform: showMore ? 'rotate(180deg)' : 'rotate(0)' }}
                  aria-hidden="true"
                />
              </button>

              {/* Expanded Options — all in one flat section */}
              {showMore && (
                <div className="space-y-5 pt-1">
                  {!isEditing && (
                    <div className="item-form-field">
                      <label className="item-form-label flex items-center gap-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
                        <CircleDot className="w-3.5 h-3.5" />
                        <span>Initial Status</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, status: 'active' }))}
                          aria-pressed={formData.status === 'active'}
                          className="p-3 rounded-xl text-xs font-semibold transition-all text-center"
                          style={{
                            backgroundColor: formData.status === 'active' ? 'var(--accent-green)' : 'var(--bg-hover)',
                            color: formData.status === 'active' ? 'white' : 'var(--text-secondary)',
                            border: `2px solid ${formData.status === 'active' ? 'var(--accent-green)' : 'transparent'}`,
                            fontFamily: "'Archivo', sans-serif",
                          }}
                        >
                          Active (Paid)
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData(prev => ({
                              ...prev,
                              status: 'trial',
                              amount: prev.amount.trim() === '' ? '0' : prev.amount,
                            }))
                          }
                          aria-pressed={formData.status === 'trial'}
                          className="p-3 rounded-xl text-xs font-semibold transition-all text-center"
                          style={{
                            backgroundColor: formData.status === 'trial' ? 'var(--accent-blue)' : 'var(--bg-hover)',
                            color: formData.status === 'trial' ? 'white' : 'var(--text-secondary)',
                            border: `2px solid ${formData.status === 'trial' ? 'var(--accent-blue)' : 'transparent'}`,
                            fontFamily: "'Archivo', sans-serif",
                          }}
                        >
                          Trial (Free)
                        </button>
                      </div>
                    </div>
                  )}

                  {formData.status === 'trial' && (
                    <div className="item-form-field">
                      <label className="item-form-label flex items-center gap-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
                        <CalendarIcon className="w-3.5 h-3.5" />
                        <span>Trial Ends</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.625rem', marginLeft: '4px' }}>OPTIONAL</span>
                      </label>
                      <DatePicker
                        id="item-trial-end-date"
                        value={formData.trial_end_date || ''}
                        onChange={(date) => {
                          setFormData(prev => ({ ...prev, trial_end_date: date }));
                        }}
                        min={today}
                        placeholder="Select trial end date"
                      />
                      <p className="item-form-mono mt-2" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {formData.trial_end_date
                          ? `Trial expires on ${formatDisplayDate(formData.trial_end_date)}`
                          : 'Leave empty for ongoing trials'}
                      </p>
                    </div>
                  )}

                  <div className="item-form-field">
                    <label className="item-form-label flex items-center gap-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
                      <Bell className="w-3.5 h-3.5" />
                      <span>Reminder</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { value: 0, label: 'None' },
                        { value: 1, label: '1 Day' },
                        { value: 3, label: '3 Days' },
                        { value: 7, label: '1 Week' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, reminder_days: opt.value }))}
                          aria-pressed={formData.reminder_days === opt.value}
                          className="py-3 rounded-xl text-xs font-semibold transition-all"
                          style={{
                            background: formData.reminder_days === opt.value ? config.gradient : 'var(--bg-hover)',
                            color: formData.reminder_days === opt.value ? config.contrastText : 'var(--text-secondary)',
                            boxShadow: formData.reminder_days === opt.value ? `0 4px 12px ${config.glowColor}` : 'none',
                            fontFamily: "'Archivo', sans-serif",
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="item-form-field">
                    <label htmlFor="item-url" className="item-form-label flex items-center gap-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
                      <Link className="w-3.5 h-3.5" />
                      <span>Website URL</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.625rem', marginLeft: '4px' }}>OPTIONAL</span>
                    </label>
                    <input
                      id="item-url"
                      type="url"
                      name="url"
                      value={formData.url}
                      onChange={handleChange}
                      autoComplete="off"
                      placeholder="https://example.com"
                      aria-invalid={Boolean(errors.url)}
                      aria-describedby={errors.url ? 'url-error' : undefined}
                      className="item-form-input w-full px-4 py-3.5 rounded-xl focus:outline-none"
                      style={{
                        border: `2px solid ${errors.url ? '#ef4444' : 'var(--border-default)'}`,
                        background: 'var(--bg-default)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    {errors.url && (
                      <p id="url-error" className="item-form-mono mt-2" style={{ color: '#ef4444', fontSize: '0.75rem' }}>
                        {errors.url}
                      </p>
                    )}
                  </div>

                  <div className="item-form-field">
                    <label htmlFor="item-notes" className="item-form-label flex items-center gap-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
                      <FileText className="w-3.5 h-3.5" />
                      <span>Notes</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.625rem', marginLeft: '4px' }}>OPTIONAL</span>
                    </label>
                    <textarea
                      id="item-notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
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
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-6 pt-5" style={{ borderTop: '1px solid var(--border-default)' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="item-form-button flex-1 px-5 py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
                disabled={isSaving}
                className={`item-form-button flex-1 px-5 py-4 rounded-xl disabled:cursor-not-allowed ${isSaving ? 'item-form-processing' : ''}`}
                style={{
                  background: config.gradient,
                  color: config.contrastText,
                  border: 'none',
                  boxShadow: `0 4px 16px ${config.glowColor}`,
                  opacity: isSaving ? 0.7 : 1,
                }}
              >
                {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : `Add ${labels.singular}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
