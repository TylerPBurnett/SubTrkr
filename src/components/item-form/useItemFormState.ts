import { useEffect, useMemo, useRef, useState } from 'react';
import { getServiceLogoUrl, type KnownService } from '@/data/knownServices';
import { getLogoUrl } from '@/config/logoApi';
import {
  formatDisplayDate,
  formatISODate,
  getNextFutureBillingDate,
  getToday,
} from '@/utils/dates';
import type { BillingCycle, ItemFormData } from '@/types';
import { getAnchoredNextBillingDate } from './billingHelpers';
import {
  ITEM_FORM_VISUAL_CONFIG,
} from './constants';
import type {
  ItemFormErrors,
  ItemFormLabels,
  ItemFormProps,
} from './types';

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function useItemFormState({
  item,
  categories,
  itemType,
  isSaving = false,
  onSave,
}: Pick<
  ItemFormProps,
  'item' | 'categories' | 'itemType' | 'isSaving' | 'onSave'
>) {
  const isEditing = Boolean(item);
  const today = formatISODate(getToday());
  const submittingRef = useRef(false);
  const labels: ItemFormLabels = {
    singular: itemType === 'bill' ? 'Bill' : 'Subscription',
    namePlaceholder:
      itemType === 'bill'
        ? 'e.g., Electric, Rent, Insurance'
        : 'e.g., Netflix, Spotify',
  };
  const filteredCategories = useMemo(() => {
    return categories.filter((category) => category.category_type === itemType);
  }, [categories, itemType]);
  const formRef = useRef<HTMLFormElement>(null);
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
  const [errors, setErrors] = useState<ItemFormErrors>({});
  const [shake, setShake] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [hasServiceSelection, setHasServiceSelection] = useState(false);

  const anchoredNextBillingDate = (
    anchorDate: string | null | undefined,
    billingCycle: BillingCycle,
  ) => getAnchoredNextBillingDate(anchorDate, billingCycle, today);

  useEffect(() => {
    if (!isSaving) {
      submittingRef.current = false;
    }
  }, [isSaving]);

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
      return;
    }

    setShowMore(false);
    setHasServiceSelection(false);
  }, [item]);

  const validate = (): ItemFormErrors => {
    const nextErrors: ItemFormErrors = {};

    if (!formData.name.trim()) {
      nextErrors.name = 'Name is required';
    }

    const amountInput = formData.amount.trim();
    const amount = Number(amountInput);
    if (!amountInput || !Number.isFinite(amount)) {
      nextErrors.amount = 'Enter a valid amount';
    } else if (amount < 0) {
      nextErrors.amount = 'Amount cannot be negative';
    } else if (amount > 999999.99) {
      nextErrors.amount = 'Amount cannot exceed $999,999.99';
    } else if (amount > 0 && amount < 0.01) {
      nextErrors.amount = 'Amount must be at least $0.01';
    } else if (formData.status !== 'trial' && amount === 0) {
      nextErrors.amount = 'Amount must be greater than 0 for paid subscriptions';
    }

    if (!formData.next_billing_date) {
      nextErrors.next_billing_date = 'Next billing date is required';
    }

    if (!formData.start_date) {
      nextErrors.start_date = 'Start date is required';
    }

    if (formData.url && !isValidUrl(formData.url)) {
      nextErrors.url = 'Enter a valid URL';
    }

    setErrors(nextErrors);
    return nextErrors;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (submittingRef.current || isSaving) {
      return;
    }

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setShake(true);
      window.setTimeout(() => setShake(false), 500);

      const firstErrorField = Object.keys(nextErrors)[0];
      if (firstErrorField && formRef.current) {
        const input = formRef.current.querySelector(
          `[name="${firstErrorField}"]`,
        ) as HTMLInputElement | null;
        input?.focus();
      }
      return;
    }

    submittingRef.current = true;

    const payload = {
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
    };

    try {
      onSave(payload);
    } catch (error) {
      submittingRef.current = false;
      throw error;
    }
  };

  const handleFieldChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = event.target;
    const processedValue = name === 'reminder_days' ? Number(value) : value;

    setFormData((previous) => {
      const updated = {
        ...previous,
        [name]: processedValue,
      };

      if (name === 'start_date') {
        updated.next_billing_date = anchoredNextBillingDate(
          updated.start_date,
          updated.billing_cycle,
        );
      } else if (name === 'billing_cycle') {
        updated.next_billing_date = anchoredNextBillingDate(
          updated.start_date,
          updated.billing_cycle as BillingCycle,
        );
      } else if (name === 'url' && !previous.logo_url) {
        try {
          const urlObject = new URL(value);
          const domain = urlObject.hostname.replace(/^www\./, '');
          updated.logo_url = getLogoUrl(domain);
        } catch {
          // Ignore invalid URLs while the user is typing.
        }
      }

      return updated;
    });

    if (errors[name as keyof ItemFormData]) {
      setErrors((previous) => ({ ...previous, [name]: undefined }));
    }
  };

  const handleNameChange = (value: string) => {
    setFormData((previous) => ({ ...previous, name: value }));
    if (errors.name) {
      setErrors((previous) => ({ ...previous, name: undefined }));
    }
  };

  const handleBillingCycleChange = (billingCycle: BillingCycle) => {
    setFormData((previous) => ({
      ...previous,
      billing_cycle: billingCycle,
      next_billing_date: anchoredNextBillingDate(
        previous.start_date,
        billingCycle,
      ),
    }));
  };

  const handleCategoryChange = (categoryId: string) => {
    setFormData((previous) => ({ ...previous, category_id: categoryId }));
  };

  const handleStartDateChange = (date: string) => {
    setFormData((previous) => ({
      ...previous,
      start_date: date,
      next_billing_date: anchoredNextBillingDate(date, previous.billing_cycle),
    }));

    if (errors.start_date) {
      setErrors((previous) => ({ ...previous, start_date: undefined }));
    }
  };

  const handleNextBillingDateChange = (date: string) => {
    setFormData((previous) => ({ ...previous, next_billing_date: date }));

    if (errors.next_billing_date) {
      setErrors((previous) => ({ ...previous, next_billing_date: undefined }));
    }
  };

  const handleServiceSelect = (service: KnownService) => {
    const categoryMatch = filteredCategories.find(
      (category) =>
        category.name.toLowerCase() ===
        service.suggestedCategory?.toLowerCase(),
    );

    setFormData((previous) => ({
      ...previous,
      name: service.name,
      amount: service.defaultPrice.toString(),
      currency: service.defaultCurrency,
      billing_cycle: service.defaultBillingCycle,
      next_billing_date: anchoredNextBillingDate(
        previous.start_date,
        service.defaultBillingCycle,
      ),
      category_id: categoryMatch?.id || previous.category_id,
      logo_url: getServiceLogoUrl(service),
      url: `https://${service.domain}`,
    }));

    setHasServiceSelection(true);

    if (errors.name) {
      setErrors((previous) => ({ ...previous, name: undefined }));
    }
  };

  const handleClearService = () => {
    if (hasServiceSelection) {
      setHasServiceSelection(false);
      setFormData((previous) => ({
        ...previous,
        name: '',
        amount: '',
        currency: 'USD',
        billing_cycle: 'monthly',
        category_id: '',
        logo_url: '',
        url: '',
        next_billing_date: anchoredNextBillingDate(
          previous.start_date,
          'monthly',
        ),
      }));
      return;
    }

    setFormData((previous) => ({ ...previous, name: '' }));
  };

  const selectedCategory = filteredCategories.find(
    (category) => category.id === formData.category_id,
  );

  return {
    config: ITEM_FORM_VISUAL_CONFIG,
    errors,
    filteredCategories,
    formData,
    formRef,
    handleBillingCycleChange,
    handleCategoryChange,
    handleClearService,
    handleFieldChange,
    handleNameChange,
    handleNextBillingDateChange,
    handleServiceSelect,
    handleStartDateChange,
    handleSubmit,
    hasServiceSelection,
    isBill: itemType === 'bill',
    isEditing,
    labels,
    selectedCategory,
    setFormData,
    setShowMore,
    shake,
    showMore,
    today,
    previewAmount: (() => {
      const numericAmount = parseFloat(formData.amount);
      if (Number.isNaN(numericAmount) || !formData.amount) {
        return '0.00';
      }

      return numericAmount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    })(),
    nextBillingLabel: formData.next_billing_date
      ? `Next charge on ${formatDisplayDate(formData.next_billing_date)}`
      : null,
  };
}
