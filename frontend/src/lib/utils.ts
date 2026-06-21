// Shared frontend utilities for formatting dates and currencies

export function formatCurrency(amount: number | null | undefined, currency = 'INR'): string {
  const value = amount || 0;
  
  // Custom quick symbols for standard currencies
  const symbols: Record<string, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥'
  };

  const symbol = symbols[currency.toUpperCase()] || currency;

  // Use Intl formatter for clean, locale-aware numbering
  try {
    const locale = currency.toUpperCase() === 'INR' ? 'en-IN' : 'en-US';
    const formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `${symbol} ${formatter.format(value)}`;
  } catch (err) {
    return `${symbol} ${value.toFixed(2)}`;
  }
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}
