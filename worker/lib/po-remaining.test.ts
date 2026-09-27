import { describe, expect, it } from 'vitest';
import { allocateBilledQuantities } from './po-remaining';

const poItems = [
  { id: 1, description: 'Design', unit_price: 1000, quantity: 10 },
  { id: 2, description: 'Build', unit_price: 500, quantity: 4 },
  { id: 3, description: 'Design', unit_price: 1000, quantity: 2 },
];

describe('allocateBilledQuantities', () => {
  it('subtracts billed quantity matched by description and price', () => {
    const billing = allocateBilledQuantities(poItems, [
      { description: 'Design', unit_price: 1000, quantity: 4 },
      { description: 'Build', unit_price: 500, quantity: 1 },
    ]);

    expect(billing.get(1)).toEqual({ invoicedQuantity: 4, remainingQuantity: 6 });
    expect(billing.get(2)).toEqual({ invoicedQuantity: 1, remainingQuantity: 3 });
    expect(billing.get(3)).toEqual({ invoicedQuantity: 0, remainingQuantity: 2 });
  });

  it('fills duplicate PO lines in order', () => {
    const billing = allocateBilledQuantities(poItems, [
      { description: 'Design', unit_price: 1000, quantity: 11 },
    ]);

    expect(billing.get(1)?.remainingQuantity).toBe(0);
    expect(billing.get(3)).toEqual({ invoicedQuantity: 1, remainingQuantity: 1 });
  });

  it('counts a linked invoice line on that PO row even if the description changed', () => {
    const billing = allocateBilledQuantities(poItems, [
      { po_item_id: 2, description: 'Build — March', unit_price: 500, quantity: 3 },
    ]);

    expect(billing.get(2)).toEqual({ invoicedQuantity: 3, remainingQuantity: 1 });
    expect(billing.get(1)?.remainingQuantity).toBe(10);
  });

  it('ignores a stale link and falls back to description', () => {
    const billing = allocateBilledQuantities(poItems, [
      { po_item_id: 99, description: 'Build', unit_price: 500, quantity: 2 },
    ]);

    expect(billing.get(2)).toEqual({ invoicedQuantity: 2, remainingQuantity: 2 });
  });

  it('does not count the same linked line twice', () => {
    const billing = allocateBilledQuantities(poItems, [
      { po_item_id: 1, description: 'Design', unit_price: 1000, quantity: 4 },
    ]);

    expect(billing.get(1)).toEqual({ invoicedQuantity: 4, remainingQuantity: 6 });
    expect(billing.get(3)?.invoicedQuantity).toBe(0);
  });
});
