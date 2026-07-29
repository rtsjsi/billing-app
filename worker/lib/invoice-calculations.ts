export interface CalculableInvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount?: number;
  sort_order?: number;
}

export interface CalculatedInvoiceItem extends CalculableInvoiceItem {
  amount: number;
}

export interface InvoiceTotals {
  items: CalculatedInvoiceItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateInvoiceTotals(
  items: CalculableInvoiceItem[],
  taxRate: number,
  discountAmount: number,
): InvoiceTotals {
  if (!Number.isFinite(taxRate) || taxRate < 0) {
    throw new Error('Tax rate must be a non-negative number');
  }
  if (!Number.isFinite(discountAmount) || discountAmount < 0) {
    throw new Error('Discount amount must be a non-negative number');
  }

  const calculatedItems = items.map((item) => {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new Error('Invoice item quantity must be greater than zero');
    }
    if (!Number.isFinite(item.unit_price) || item.unit_price < 0) {
      throw new Error('Invoice item unit price cannot be negative');
    }
    return {
      ...item,
      amount: roundMoney(item.quantity * item.unit_price),
    };
  });

  const subtotal = roundMoney(calculatedItems.reduce((sum, item) => sum + item.amount, 0));
  const taxAmount = roundMoney(subtotal * taxRate / 100);
  const total = roundMoney(subtotal + taxAmount - discountAmount);
  if (total < 0) {
    throw new Error('Discount amount cannot exceed the invoice amount');
  }

  return { items: calculatedItems, subtotal, taxAmount, total };
}
