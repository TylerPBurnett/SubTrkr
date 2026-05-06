import { Calendar as CalendarIcon, ChevronDown, SlidersHorizontal, Sparkles, Tag } from 'lucide-react';
import ServiceAutocomplete from '@/components/ui/ServiceAutocomplete';
import { DatePicker } from '@/components/ui/date-picker';
import type {
  BillingCycle,
  Category,
  ItemFormData,
  ItemType,
} from '@/types';
import type { KnownService } from '@/data/knownServices';
import { BILLING_CYCLES, CURRENCIES } from './constants';
import type {
  ItemFormErrors,
  ItemFormLabels,
  ItemFormVisualConfig,
} from './types';

interface ItemFormPrimaryFieldsProps {
  errors: ItemFormErrors;
  filteredCategories: Category[];
  formData: ItemFormData;
  hasServiceSelection: boolean;
  isEditing: boolean;
  itemType: ItemType;
  labels: ItemFormLabels;
  nextBillingLabel: string | null;
  onBillingCycleChange: (billingCycle: BillingCycle) => void;
  onCategoryChange: (categoryId: string) => void;
  onFieldChange: (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => void;
  onNameChange: (value: string) => void;
  onServiceClear: () => void;
  onServiceSelect: (service: KnownService) => void;
  onShowMoreToggle: () => void;
  onStartDateChange: (date: string) => void;
  onNextBillingDateChange: (date: string) => void;
  config: ItemFormVisualConfig;
  showMore: boolean;
}

export function ItemFormPrimaryFields({
  errors,
  filteredCategories,
  formData,
  hasServiceSelection,
  isEditing,
  itemType,
  labels,
  nextBillingLabel,
  onBillingCycleChange,
  onCategoryChange,
  onFieldChange,
  onNameChange,
  onServiceClear,
  onServiceSelect,
  onShowMoreToggle,
  onStartDateChange,
  onNextBillingDateChange,
  config,
  showMore,
}: ItemFormPrimaryFieldsProps) {
  return (
    <>
      <div className="item-form-field">
        <label
          htmlFor="item-name"
          className="item-form-label flex items-center gap-2 mb-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{labels.singular} Name</span>
          <span style={{ color: 'var(--brand-text)' }}>*</span>
        </label>
        <ServiceAutocomplete
          id="item-name"
          value={formData.name}
          itemType={itemType}
          onChange={(value) => {
            if (!value && hasServiceSelection) {
              onServiceClear();
            } else {
              onNameChange(value);
            }
          }}
          onServiceSelect={onServiceSelect}
          onClear={onServiceClear}
          showClear={formData.name.length > 0}
          placeholder={labels.namePlaceholder}
          error={errors.name}
          autoFocus={!isEditing}
        />
      </div>

      <div className="item-form-field">
        <label
          className="item-form-label flex items-center gap-2 mb-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>Amount</span>
          <span style={{ color: 'var(--brand-text)' }}>*</span>
        </label>
        <div
          className="item-form-amount-container flex items-center rounded-xl overflow-hidden transition-all"
          style={{
            border: `2px solid ${errors.amount ? '#ef4444' : 'var(--border-default)'}`,
            background: 'var(--bg-default)',
          }}
        >
          <select
            id="item-currency"
            name="currency"
            value={formData.currency}
            onChange={onFieldChange}
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
            {CURRENCIES.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.symbol} {currency.code}
              </option>
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
            onChange={onFieldChange}
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
          <p className="item-form-mono mt-2" style={{ color: '#ef4444', fontSize: '0.75rem' }}>
            {errors.amount}
          </p>
        )}
        {!errors.amount && formData.status === 'trial' && (
          <p className="item-form-mono mt-2" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            Trial subscriptions can use an amount of 0.
          </p>
        )}
      </div>

      <div className="item-form-field">
        <label
          className="item-form-label flex items-center gap-2 mb-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>Frequency</span>
        </label>
        <div className="grid grid-cols-4 gap-2">
          {BILLING_CYCLES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onBillingCycleChange(value)}
              aria-pressed={formData.billing_cycle === value}
              className="py-3 rounded-xl text-xs font-semibold transition-all"
              style={{
                background:
                  formData.billing_cycle === value
                    ? 'var(--brand-primary)'
                    : 'var(--bg-hover)',
                color:
                  formData.billing_cycle === value
                    ? config.contrastText
                    : 'var(--text-secondary)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="item-form-field">
        <label
          className="item-form-label flex items-center gap-2 mb-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Category</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {filteredCategories.slice(0, 7).map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() =>
                onCategoryChange(
                  formData.category_id === category.id ? '' : category.id,
                )
              }
              aria-pressed={formData.category_id === category.id}
              className="p-2.5 rounded-xl text-xs font-semibold transition-all text-center truncate"
              style={{
                backgroundColor:
                  formData.category_id === category.id
                    ? category.color
                    : 'var(--bg-hover)',
                color:
                  formData.category_id === category.id
                    ? 'white'
                    : 'var(--text-secondary)',
                border: `2px solid ${
                  formData.category_id === category.id
                    ? category.color
                    : 'transparent'
                }`,
                transform:
                  formData.category_id === category.id ? 'scale(1.01)' : 'scale(1)',
                fontFamily: "'Archivo', sans-serif",
              }}
            >
              {category.name}
            </button>
          ))}
          {filteredCategories.length > 7 && (
            <select
              value={
                filteredCategories.slice(7).some((category) => category.id === formData.category_id)
                  ? formData.category_id
                  : ''
              }
              onChange={(event) => onCategoryChange(event.target.value)}
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
              {filteredCategories.slice(7).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="item-form-field grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            className="item-form-label flex items-center gap-2 mb-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Start Date</span>
            <span style={{ color: 'var(--brand-text)' }}>*</span>
          </label>
          <DatePicker
            id="item-start-date"
            value={formData.start_date}
            onChange={onStartDateChange}
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
          <label
            className="item-form-label flex items-center gap-2 mb-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Next Billing</span>
            <span style={{ color: 'var(--brand-text)' }}>*</span>
          </label>
          <DatePicker
            id="item-next-billing-date"
            value={formData.next_billing_date}
            onChange={onNextBillingDateChange}
            error={Boolean(errors.next_billing_date)}
            placeholder="Select billing date"
          />
          {errors.next_billing_date && (
            <p id="next-billing-date-error" className="item-form-mono mt-2" style={{ color: '#ef4444', fontSize: '0.75rem' }}>
              {errors.next_billing_date}
            </p>
          )}
          {!errors.next_billing_date && nextBillingLabel && (
            <p className="item-form-mono mt-2" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              {nextBillingLabel}
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onShowMoreToggle}
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
    </>
  );
}
