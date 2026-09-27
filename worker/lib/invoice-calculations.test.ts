import { describe, expect, it } from 'vitest';
import { calculateInvoiceTotals, roundMoney } from './invoice-calculations';

describe('invoice calculations', () => {
  it('recomputes item amounts and totals from authoritative inputs', () => {
    const result = calculateInvoiceTotals([
      { description: 'Consulting', quantity: 2.5, unit_price: 1000, amount: 1 },
      { description: 'Support', quantity: 1, unit_price: 500 },
    ], 18, 100);

    expect(result.items.map((item) => item.amount)).toEqual([2500, 500]);
    expect(result.subtotal).toBe(3000);
    expect(result.taxAmount).toBe(540);
    expect(result.total).toBe(3440);
  });

  it('rounds monetary values to two decimal places', () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(calculateInvoiceTotals([
      { description: 'Usage', quantity: 3, unit_price: 0.335 },
    ], 0, 0).total).toBe(1.01);
  });

  it('rejects invalid quantities and excessive discounts', () => {
    expect(() => calculateInvoiceTotals([
      { description: 'Invalid', quantity: 0, unit_price: 10 },
    ], 0, 0)).toThrow('quantity');

    expect(() => calculateInvoiceTotals([
      { description: 'Valid', quantity: 1, unit_price: 10 },
    ], 0, 11)).toThrow('Discount');
  });
});
