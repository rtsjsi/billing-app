/** Shared formatting for PDF/Excel reports. */

export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Neutralize spreadsheet formula injection. */
export function excelSafeString(value: string): string {
  const trimmed = value ?? '';
  if (/^[\s]*[=+\-@\t\r]/.test(trimmed)) {
    return `'${trimmed}`;
  }
  return trimmed;
}

/** Helvetica (WinAnsi) cannot encode ₹ and most Unicode. */
export function toPdfSafe(value: string): string {
  return Array.from(value || '')
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code === 8377 || code === 8360) return 'Rs.';
      if (code < 32) return ' ';
      if (code > 126) return '?';
      return ch;
    })
    .join('');
}

export function formatAmount(value: number | null | undefined): string {
  const n = Number(value) || 0;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function paymentMethodLabel(method: string | null | undefined): string {
  switch (method) {
    case 'bank_transfer':
      return 'Bank transfer';
    case 'upi':
      return 'UPI';
    case 'cash':
      return 'Cash';
    case 'cheque':
      return 'Cheque';
    case 'other':
      return 'Other';
    default:
      return method || '—';
  }
}

export function slugifyFilename(value: string): string {
  return value.replace(/[^\w.-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'report';
}

export function columnLetter(index: number): string {
  let n = index + 1;
  let letters = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}
