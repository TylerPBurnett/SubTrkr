import type { BillingCycle } from '@/types';
import type { ItemFormVisualConfig } from './types';

export const BILLING_CYCLES: Array<{
  value: BillingCycle;
  label: string;
  short: string;
}> = [
  { value: 'weekly', label: 'Weekly', short: '/wk' },
  { value: 'monthly', label: 'Monthly', short: '/mo' },
  { value: 'quarterly', label: 'Quarterly', short: '/qtr' },
  { value: 'yearly', label: 'Yearly', short: '/yr' },
];

export const CURRENCIES = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'CAD', symbol: 'C$' },
  { code: 'AUD', symbol: 'A$' },
  { code: 'JPY', symbol: '¥' },
];

export const ITEM_FORM_VISUAL_CONFIG: ItemFormVisualConfig = {
  textColor: 'var(--brand-text)',
  contrastText: 'var(--brand-on-primary)',
};

export const ITEM_FORM_STYLES = `
  .item-form-modal {
    animation: itemFormFadeInScale 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .item-form-header {
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .item-form-mono {
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: -0.01em;
  }

  .item-form-label {
    font-weight: 500;
    font-size: 0.8125rem;
    color: var(--text-secondary);
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

  .item-form-input:focus,
  .item-form-input:focus-visible {
    transform: translateY(-1px);
    border-color: var(--brand-primary) !important;
  }

  .item-form-amount-container:focus-within {
    border-color: var(--brand-primary) !important;
  }

  .item-form-input[type="number"]::-webkit-inner-spin-button,
  .item-form-input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .item-form-input[type="number"] {
    -moz-appearance: textfield;
  }

  .item-form-button {
    font-weight: 600;
    font-size: 0.9375rem;
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

`;
