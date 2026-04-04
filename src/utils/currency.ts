type CurrencyDisplayMode = 'compact' | 'precise' | 'summary';

interface FormatCurrencyOptions {
  currency?: string;
  display?: CurrencyDisplayMode;
}

function formatCompactUsd(amount: number): string {
  const absoluteAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (absoluteAmount >= 1000) {
    const compactValue = absoluteAmount >= 10000
      ? (absoluteAmount / 1000).toFixed(0)
      : (absoluteAmount / 1000).toFixed(1);
    return `${sign}$${compactValue}k`;
  }

  return `${sign}$${Math.round(absoluteAmount)}`;
}

export function formatCurrency(
  amount: number,
  {
    currency = 'USD',
    display = 'precise',
  }: FormatCurrencyOptions = {}
): string {
  if (display === 'compact') {
    if (currency !== 'USD') {
      return formatCurrency(amount, { currency, display: 'summary' });
    }

    return formatCompactUsd(amount);
  }

  const fractionDigits = display === 'summary' ? 0 : 2;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}
