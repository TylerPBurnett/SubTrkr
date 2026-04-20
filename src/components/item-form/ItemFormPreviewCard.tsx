import { X } from 'lucide-react';
import ServiceLogo from '@/components/ui/ServiceLogo';
import type { Category, ItemFormData, ItemType } from '@/types';
import { BILLING_CYCLES, CURRENCIES } from './constants';
import type { ItemFormLabels, ItemFormVisualConfig } from './types';

interface ItemFormPreviewCardProps {
  formData: ItemFormData;
  itemType: ItemType;
  labels: ItemFormLabels;
  selectedCategory?: Category;
  config: ItemFormVisualConfig;
  previewAmount: string;
  onClearLogo: () => void;
}

export function ItemFormPreviewCard({
  formData,
  itemType,
  labels,
  selectedCategory,
  config,
  previewAmount,
  onClearLogo,
}: ItemFormPreviewCardProps) {
  return (
    <div
      className="mb-6 p-5 rounded-2xl item-form-field transition-all duration-300"
      style={{
        background: formData.name.trim()
          ? `linear-gradient(135deg, ${config.glowColor}, transparent)`
          : 'var(--bg-hover)',
        border: `1px solid ${
          formData.name.trim()
            ? itemType === 'bill'
              ? 'rgba(245, 158, 11, 0.2)'
              : 'rgba(34, 197, 94, 0.2)'
            : 'var(--border-default)'
        }`,
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
              onClick={onClearLogo}
              aria-label="Clear logo"
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              style={{
                backgroundColor: 'var(--accent-red)',
                color: 'white',
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
            style={{
              color: formData.name.trim()
                ? 'var(--text-primary)'
                : 'var(--text-muted)',
            }}
          >
            {formData.name || `${labels.singular} name`}
          </p>
          <p
            className="item-form-mono"
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            {selectedCategory?.name || 'Category'} •{' '}
            {BILLING_CYCLES.find((cycle) => cycle.value === formData.billing_cycle)
              ?.label || 'Monthly'}
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
            {(CURRENCIES.find((currency) => currency.code === formData.currency) ||
              CURRENCIES[0]).symbol}
            {previewAmount}
          </p>
          <p
            className="item-form-mono"
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.6875rem',
              fontWeight: 600,
            }}
          >
            {BILLING_CYCLES.find((cycle) => cycle.value === formData.billing_cycle)
              ?.short || '/mo'}
          </p>
        </div>
      </div>
    </div>
  );
}
