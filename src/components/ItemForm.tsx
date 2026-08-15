import { useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
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
    handleTrialEndDateChange,
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
    isSaving,
    onSave,
  });

  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <style>{ITEM_FORM_STYLES}</style>

      <Dialog.Root
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <Dialog.Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Dialog.Overlay
              className="absolute inset-0 backdrop-blur-md"
              style={{
                background:
                  'radial-gradient(circle at center, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7))',
              }}
            />

            <Dialog.Content
              ref={contentRef}
              aria-modal="true"
              className={`relative w-full max-w-lg item-form-modal ${shake ? 'item-form-shake' : ''}`}
              style={{
                background: 'var(--bg-surface)',
                boxShadow: 'var(--shadow-floating)',
                borderRadius: '20px',
                overflow: 'hidden',
                maxHeight: '92vh',
              }}
              onOpenAutoFocus={(event) => {
                // The name field owns initial focus for new items; keep that
                // behaviour instead of pulling focus to the close button.
                if (contentRef.current?.contains(document.activeElement)) {
                  event.preventDefault();
                }
              }}
              onInteractOutside={(event) => {
                // DatePicker portals to <body>. A day click is outside this
                // Content node, and the default dismiss would close the form
                // before onSelect can write the date.
                const target = event.target;
                if (
                  target instanceof Element &&
                  target.closest('[data-slot="popover-content"]')
                ) {
                  event.preventDefault();
                }
              }}
            >
              <div className="px-8 pt-7 pb-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      style={{
                        background: 'color-mix(in srgb, var(--brand-primary) 14%, transparent)',
                        boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--brand-primary) 24%, transparent)',
                        borderRadius: '14px',
                        padding: '14px',
                        color: 'var(--brand-text)',
                      }}
                    >
                      {isBill ? (
                        <Receipt className="w-7 h-7" style={{ strokeWidth: 2 }} />
                      ) : (
                        <CreditCard className="w-7 h-7" style={{ strokeWidth: 2 }} />
                      )}
                    </div>
                    <div>
                      <Dialog.Title
                        className="item-form-header"
                        style={{
                          fontSize: '1.75rem',
                          color: 'var(--text-primary)',
                          lineHeight: 1.1,
                        }}
                      >
                        {isEditing ? 'Edit' : 'New'} {labels.singular}
                      </Dialog.Title>
                      <Dialog.Description
                        className="item-form-mono mt-1"
                        style={{
                          color: 'var(--brand-text)',
                          fontWeight: 600,
                          fontSize: '0.8125rem',
                        }}
                      >
                        {isEditing ? 'Update payment details' : 'Track a recurring payment'}
                      </Dialog.Description>
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
                    onTrialEndDateChange={handleTrialEndDateChange}
                    showMore={showMore}
                    today={today}
                    trialEndError={errors.trial_end_date}
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
                      background: 'var(--brand-primary)',
                      color: config.contrastText,
                      border: 'none',
                      opacity: isSaving ? 0.7 : 1,
                    }}
                  >
                    {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : `Add ${labels.singular}`}
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
