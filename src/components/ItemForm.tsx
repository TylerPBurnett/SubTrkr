import { AlertCircle, CreditCard, Receipt, X } from 'lucide-react';
import { ITEM_FORM_STYLES } from '@/components/item-form/constants';
import { ItemFormPreviewCard } from '@/components/item-form/ItemFormPreviewCard';
import { ItemFormPrimaryFields } from '@/components/item-form/ItemFormPrimaryFields';
import { ItemFormSecondaryFields } from '@/components/item-form/ItemFormSecondaryFields';
import { useItemFormState } from '@/components/item-form/useItemFormState';
import type { ItemFormProps } from '@/components/item-form/types';

export default function ItemForm({
  item,
  categories,
  itemType,
  isSaving = false,
  onSave,
  onClose,
}: ItemFormProps) {
  const {
    config,
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
    isBill,
    isEditing,
    labels,
    nextBillingLabel,
    previewAmount,
    selectedCategory,
    setFormData,
    setShowMore,
    shake,
    showMore,
    today,
  } = useItemFormState({
    item,
    categories,
    itemType,
    onSave,
  });

  return (
    <>
      <style>{ITEM_FORM_STYLES}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 backdrop-blur-md"
          style={{
            background:
              'radial-gradient(circle at center, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7))',
          }}
          onClick={onClose}
        />

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
          <div
            className="item-form-hero"
            style={{
              background: config.gradient,
              height: '6px',
            }}
          />

          <div className="px-8 pt-7 pb-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
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

          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="px-8 pb-8 overflow-y-auto max-h-[calc(92vh-140px)]"
          >
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
                    {Object.values(errors)
                      .filter(Boolean)
                      .map((error, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span>•</span>
                          <span>{error}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            )}

            <ItemFormPreviewCard
              formData={formData}
              itemType={itemType}
              labels={labels}
              selectedCategory={selectedCategory}
              config={config}
              previewAmount={previewAmount}
              onClearLogo={() => setFormData((previous) => ({ ...previous, logo_url: '' }))}
            />

            <div className="space-y-5">
              <ItemFormPrimaryFields
                errors={errors}
                filteredCategories={filteredCategories}
                formData={formData}
                hasServiceSelection={hasServiceSelection}
                isEditing={isEditing}
                itemType={itemType}
                labels={labels}
                nextBillingLabel={nextBillingLabel}
                onBillingCycleChange={handleBillingCycleChange}
                onCategoryChange={handleCategoryChange}
                onFieldChange={handleFieldChange}
                onNameChange={handleNameChange}
                onServiceClear={handleClearService}
                onServiceSelect={handleServiceSelect}
                onShowMoreToggle={() => setShowMore((previous) => !previous)}
                onStartDateChange={handleStartDateChange}
                onNextBillingDateChange={handleNextBillingDateChange}
                config={config}
                showMore={showMore}
              />

              <ItemFormSecondaryFields
                config={config}
                formData={formData}
                isEditing={isEditing}
                onFieldChange={handleFieldChange}
                onReminderDaysChange={(reminderDays) =>
                  setFormData((previous) => ({ ...previous, reminder_days: reminderDays }))
                }
                onStatusChange={(status) =>
                  setFormData((previous) => ({
                    ...previous,
                    status,
                    amount:
                      status === 'trial' && previous.amount.trim() === ''
                        ? '0'
                        : previous.amount,
                  }))
                }
                onTrialEndDateChange={(date) =>
                  setFormData((previous) => ({ ...previous, trial_end_date: date }))
                }
                showMore={showMore}
                today={today}
                urlError={errors.url}
              />
            </div>

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
