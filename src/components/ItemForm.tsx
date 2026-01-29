import { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  AlertCircle,
  Receipt,
  CreditCard,
  DollarSign,
  Calendar,
  Tag,
  Bell,
  Link,
  FileText,
  Sparkles,
  ChevronDown,
  CircleDot
} from 'lucide-react';
import type { Category, ItemWithCategory, BillingCycle, ItemFormData, ItemType, ItemStatus } from '@/types';
import { getNextFutureBillingDate, formatISODate, getToday, formatDisplayDate } from '../utils/dates';
import ServiceAutocomplete from './ui/ServiceAutocomplete';
import ServiceLogo from './ui/ServiceLogo';
import { getServiceLogoUrl, type KnownService } from '../data/knownServices';
import { getLogoUrl } from '../config/logoApi';

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
  const [showOptional, setShowOptional] = useState(false);
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
        logo_url: item.logo_url || '',
        reminder_days: item.reminder_days,
        item_type: item.item_type,
        status: item.status,
        trial_end_date: item.trial_end_date || '',
      });
      // Show optional fields if they have data
      if (item.notes || item.url) {
        setShowOptional(true);
      }
    }
  }, [item]);

  const validate = (): Partial<Record<keyof ItemFormData, string>> => {
    const newErrors: Partial<Record<keyof ItemFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    const amount = parseFloat(formData.amount);
    const minAmount = formData.status === 'trial' ? 0 : 0.01;
    if (isNaN(amount) || amount < 0) {
      newErrors.amount = 'Enter a valid amount';
    } else if (amount < minAmount) {
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
      amount: parseFloat(formData.amount),
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

    if (errors.name) {
      setErrors(prev => ({ ...prev, name: undefined }));
    }
  };

  const currentCurrency = currencies.find(c => c.code === formData.currency) || currencies[0];
  const currentCycle = billingCycles.find(c => c.value === formData.billing_cycle) || billingCycles[1];
  const selectedCategory = filteredCategories.find(c => c.id === formData.category_id);

  const formatDisplayAmount = (amount: string) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return '0.00';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`zoom-in-95 relative w-full max-w-xl rounded-3xl shadow-2xl max-h-[92vh] overflow-hidden ${shake ? 'animate-shake' : ''}`}
        style={{ backgroundColor: 'var(--bg-surface)' }}
      >
        {/* Gradient header bar */}
        <div
          className="h-1.5"
          style={{
            background: itemType === 'bill'
              ? 'linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)'
              : 'linear-gradient(90deg, var(--brand-primary) 0%, #06b6d4 100%)'
          }}
        />

        {/* Header */}
        <div className="px-8 pt-6 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: itemType === 'bill'
                    ? 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)'
                    : 'linear-gradient(135deg, var(--brand-primary) 0%, #06b6d4 100%)',
                  boxShadow: itemType === 'bill'
                    ? '0 8px 24px -4px rgba(245, 158, 11, 0.4)'
                    : '0 8px 24px -4px rgba(34, 197, 94, 0.4)'
                }}
              >
                {itemType === 'bill' ? (
                  <Receipt className="w-7 h-7 text-white" />
                ) : (
                  <CreditCard className="w-7 h-7 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-2xl" style={{ fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                  {isEditing ? 'Edit' : 'New'} {labels.singular}
                </h2>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {isEditing ? 'Update payment details' : 'Track a recurring payment'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl transition-all hover:scale-105"
              style={{
                backgroundColor: 'var(--bg-hover)',
                color: 'var(--text-muted)'
              }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="px-8 pb-8 overflow-y-auto max-h-[calc(92vh-140px)]">
          {/* Error summary */}
          {Object.keys(errors).length > 0 && (
            <div
              className="mb-6 p-4 rounded-2xl flex items-start gap-3"
              style={{
                backgroundColor: 'var(--accent-red-muted)',
                border: '1px solid var(--accent-red)'
              }}
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--accent-red)' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--accent-red)' }}>Please fix the following:</p>
                <ul className="mt-1 text-sm space-y-0.5" style={{ color: 'var(--accent-red)' }}>
                  {Object.values(errors).filter(Boolean).map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Preview Card */}
          <div
            className="mb-6 p-5 rounded-2xl border-2 border-dashed transition-all"
            style={{
              borderColor: formData.name ? (selectedCategory?.color || 'var(--brand-primary)') : 'var(--border-default)',
              backgroundColor: formData.name ? 'var(--bg-hover)' : 'transparent'
            }}
          >
            <div className="flex items-center gap-4">
              <div className="relative group">
                <ServiceLogo
                  logoUrl={formData.logo_url || null}
                  name={formData.name || 'Service'}
                  size="lg"
                  itemType={itemType}
                  categoryName={selectedCategory?.name}
                  categoryColor={selectedCategory?.color}
                />
                {formData.logo_url && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, logo_url: '' }))}
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
                  className="font-semibold text-lg truncate"
                  style={{ color: formData.name ? 'var(--text-primary)' : 'var(--text-muted)' }}
                >
                  {formData.name || 'Service name'}
                </p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {selectedCategory?.name || 'Category'} • {currentCycle.label}
                </p>
              </div>
              <div className="text-right">
                <p
                  className="font-mono text-2xl"
                  style={{
                    fontWeight: 700,
                    color: formData.amount ? 'var(--text-primary)' : 'var(--text-muted)',
                    letterSpacing: '-0.02em'
                  }}
                >
                  {currentCurrency.symbol}{formatDisplayAmount(formData.amount)}
                </p>
                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                  {currentCycle.short}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Service Name */}
            <div className="stagger-item" style={{ animationDelay: '0.05s' }}>
              <label className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
                <span className="label">{labels.singular} Name</span>
              </label>
              <ServiceAutocomplete
                value={formData.name}
                itemType={itemType}
                onChange={(value) => {
                  setFormData(prev => {
                    // Clear logo when manually typing, unless it was set from URL field
                    const urlGeneratedLogo = prev.url ? (() => {
                      try {
                        const urlObj = new URL(prev.url);
                        const domain = urlObj.hostname.replace(/^www\./, '');
                        return getLogoUrl(domain);
                      } catch {
                        return null;
                      }
                    })() : null;

                    return {
                      ...prev,
                      name: value,
                      // Only keep logo if it was generated from URL field
                      logo_url: urlGeneratedLogo === prev.logo_url ? prev.logo_url : ''
                    };
                  });
                  if (errors.name) {
                    setErrors(prev => ({ ...prev, name: undefined }));
                  }
                }}
                onServiceSelect={handleServiceSelect}
                placeholder={labels.namePlaceholder}
                error={errors.name}
                autoFocus={!isEditing}
              />
            </div>

            {/* Amount Section - Hero */}
            <div className="stagger-item" style={{ animationDelay: '0.1s' }}>
              <label className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
                <span className="label">Amount & Frequency</span>
              </label>
              <div
                className="p-4 rounded-2xl"
                style={{ backgroundColor: 'var(--bg-hover)' }}
              >
                <div className="flex items-center gap-3">
                  {/* Currency */}
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="appearance-none px-3 py-3 rounded-xl font-mono font-semibold text-center cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '2px solid var(--border-default)',
                      color: 'var(--text-primary)',
                      width: '72px'
                    }}
                  >
                    {currencies.map(c => (
                      <option key={c.code} value={c.code}>{c.symbol}</option>
                    ))}
                  </select>

                  {/* Amount */}
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full px-4 py-3 rounded-xl font-mono text-right"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        border: `2px solid ${errors.amount ? 'var(--accent-red)' : 'var(--border-default)'}`,
                        color: 'var(--text-primary)',
                        fontSize: '1.75rem',
                        fontWeight: 700,
                        letterSpacing: '-0.02em'
                      }}
                    />
                  </div>

                  {/* Billing Cycle */}
                  <select
                    name="billing_cycle"
                    value={formData.billing_cycle}
                    onChange={handleChange}
                    className="appearance-none px-4 py-3 rounded-xl font-semibold cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '2px solid var(--border-default)',
                      color: 'var(--text-secondary)',
                      minWidth: '110px'
                    }}
                  >
                    {billingCycles.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                {errors.amount && (
                  <p className="mt-2 text-sm" style={{ color: 'var(--accent-red)' }}>{errors.amount}</p>
                )}
              </div>
            </div>

            {/* Category */}
            <div className="stagger-item" style={{ animationDelay: '0.15s' }}>
              <label className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
                <span className="label">Category</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {filteredCategories.slice(0, 7).map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, category_id: cat.id }))}
                    className="p-3 rounded-xl text-sm font-medium transition-all text-center truncate"
                    style={{
                      backgroundColor: formData.category_id === cat.id ? cat.color : 'var(--bg-hover)',
                      color: formData.category_id === cat.id ? 'white' : 'var(--text-secondary)',
                      border: `2px solid ${formData.category_id === cat.id ? cat.color : 'transparent'}`,
                      transform: formData.category_id === cat.id ? 'scale(1.02)' : 'scale(1)'
                    }}
                  >
                    {cat.name}
                  </button>
                ))}
                {filteredCategories.length > 7 && (
                  <select
                    value={filteredCategories.slice(7).some(c => c.id === formData.category_id) ? formData.category_id : ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                    className="p-3 rounded-xl text-sm font-medium cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-hover)',
                      border: '2px solid transparent',
                      color: 'var(--text-secondary)'
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

            {/* Status Selection */}
            {!isEditing && (
              <div className="stagger-item" style={{ animationDelay: '0.175s' }}>
                <label className="flex items-center gap-2 mb-2">
                  <CircleDot className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
                  <span className="label">Initial Status</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, status: 'active' }))}
                    className="p-3 rounded-xl text-sm font-medium transition-all text-center"
                    style={{
                      backgroundColor: formData.status === 'active' ? 'var(--accent-green)' : 'var(--bg-hover)',
                      color: formData.status === 'active' ? 'white' : 'var(--text-secondary)',
                      border: `2px solid ${formData.status === 'active' ? 'var(--accent-green)' : 'transparent'}`,
                    }}
                  >
                    Active (Paid)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, status: 'trial' }))}
                    className="p-3 rounded-xl text-sm font-medium transition-all text-center"
                    style={{
                      backgroundColor: formData.status === 'trial' ? 'var(--accent-blue)' : 'var(--bg-hover)',
                      color: formData.status === 'trial' ? 'white' : 'var(--text-secondary)',
                      border: `2px solid ${formData.status === 'trial' ? 'var(--accent-blue)' : 'transparent'}`,
                    }}
                  >
                    Trial (Free)
                  </button>
                </div>
              </div>
            )}

            {/* Trial End Date - Only show if status is trial */}
            {formData.status === 'trial' && (
              <div className="stagger-item" style={{ animationDelay: '0.18s' }}>
                <label className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4" style={{ color: 'var(--accent-blue)' }} />
                  <span className="label">Trial Ends</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Optional</span>
                </label>
                <input
                  type="date"
                  name="trial_end_date"
                  value={formData.trial_end_date || ''}
                  onChange={handleChange}
                  min={today}
                  className="input w-full px-4 py-3 rounded-xl"
                  placeholder="When does the trial expire?"
                />
                <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                  {formData.trial_end_date
                    ? `Trial expires on ${formatDisplayDate(formData.trial_end_date)}`
                    : 'Leave empty for ongoing trials'}
                </p>
              </div>
            )}

            {/* Dates */}
            <div className="stagger-item grid grid-cols-2 gap-4" style={{ animationDelay: '0.2s' }}>
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
                  <span className="label">Next Billing</span>
                </label>
                <input
                  type="date"
                  name="next_billing_date"
                  value={formData.next_billing_date}
                  onChange={handleChange}
                  className="input w-full px-4 py-3 rounded-xl"
                  style={{
                    borderColor: errors.next_billing_date ? 'var(--accent-red)' : 'var(--border-default)',
                  }}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <span className="label">Start Date</span>
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className="input w-full px-4 py-3 rounded-xl"
                  style={{
                    borderColor: errors.start_date ? 'var(--accent-red)' : 'var(--border-default)',
                  }}
                />
              </div>
            </div>

            {/* Reminder */}
            <div className="stagger-item" style={{ animationDelay: '0.25s' }}>
              <label className="flex items-center gap-2 mb-2">
                <Bell className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
                <span className="label">Reminder</span>
              </label>
              <div className="flex gap-2">
                {[
                  { value: 0, label: 'None' },
                  { value: 1, label: '1 day' },
                  { value: 3, label: '3 days' },
                  { value: 7, label: '1 week' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, reminder_days: opt.value }))}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{
                      backgroundColor: formData.reminder_days === opt.value ? 'var(--brand-primary)' : 'var(--bg-hover)',
                      color: formData.reminder_days === opt.value ? 'white' : 'var(--text-secondary)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Fields Toggle */}
            <button
              type="button"
              onClick={() => setShowOptional(!showOptional)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all"
              style={{
                backgroundColor: 'var(--bg-hover)',
                color: 'var(--text-muted)'
              }}
            >
              <span>{showOptional ? 'Hide' : 'Show'} optional fields</span>
              <ChevronDown
                className="w-4 h-4 transition-transform"
                style={{ transform: showOptional ? 'rotate(180deg)' : 'rotate(0)' }}
              />
            </button>

            {/* Optional Fields */}
            {showOptional && (
              <div className="space-y-5 pt-2">
                {/* URL */}
                <div className="stagger-item">
                  <label className="flex items-center gap-2 mb-2">
                    <Link className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    <span className="label">Website URL</span>
                  </label>
                  <input
                    type="url"
                    name="url"
                    value={formData.url}
                    onChange={handleChange}
                    placeholder="https://..."
                    className="input w-full px-4 py-3 rounded-xl"
                    style={{
                      borderColor: errors.url ? 'var(--accent-red)' : 'var(--border-default)',
                    }}
                  />
                  {errors.url && (
                    <p className="mt-1.5 text-sm" style={{ color: 'var(--accent-red)' }}>{errors.url}</p>
                  )}
                </div>

                {/* Notes */}
                <div className="stagger-item">
                  <label className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    <span className="label">Notes</span>
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Any additional notes..."
                    className="input w-full px-4 py-3 rounded-xl resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-8 pt-6" style={{ borderTop: '1px solid var(--border-default)' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="btn-secondary flex-1 px-6 py-3.5 rounded-xl font-semibold transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-6 py-3.5 rounded-xl font-semibold transition-all disabled:opacity-50"
              style={{
                background: itemType === 'bill'
                  ? 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)'
                  : 'linear-gradient(135deg, var(--brand-primary) 0%, #06b6d4 100%)',
                color: 'white',
                boxShadow: itemType === 'bill'
                  ? '0 4px 14px -3px rgba(245, 158, 11, 0.4)'
                  : '0 4px 14px -3px rgba(34, 197, 94, 0.4)'
              }}
            >
              {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : `Add ${labels.singular}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
