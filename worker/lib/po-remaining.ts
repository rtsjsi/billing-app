export interface PoQtyLine {
  id: number;
  description: string;
  unit_price: number;
  quantity: number;
}

export interface BilledQtyLine {
  po_item_id?: number | null;
  description: string;
  unit_price: number;
  quantity: number;
}

export interface PoLineBilling {
  invoicedQuantity: number;
  remainingQuantity: number;
}

export function roundQty(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

function lineKey(description: string, unitPrice: number): string {
  return `${description.trim().toLowerCase()}|${roundQty(Number(unitPrice) || 0).toFixed(4)}`;
}

/**
 * How much of each PO line is already on non-cancelled invoices.
 * Lines linked by po_item_id are counted on that row. Older lines without a
 * link are filled in PO order against the same description and unit price.
 */
export function allocateBilledQuantities(
  poItems: PoQtyLine[],
  billed: BilledQtyLine[],
): Map<number, PoLineBilling> {
  const validIds = new Set(poItems.map((item) => item.id));
  const linked = new Map<number, number>();
  const pools = new Map<string, number>();

  for (const line of billed) {
    const quantity = Number(line.quantity) || 0;
    if (quantity <= 0) continue;
    const poItemId = line.po_item_id == null ? null : Number(line.po_item_id);
    if (poItemId != null && validIds.has(poItemId)) {
      linked.set(poItemId, (linked.get(poItemId) ?? 0) + quantity);
      continue;
    }
    const key = lineKey(line.description, line.unit_price);
    pools.set(key, (pools.get(key) ?? 0) + quantity);
  }

  const result = new Map<number, PoLineBilling>();
  for (const item of poItems) {
    const poQty = Math.max(0, Number(item.quantity) || 0);
    const fromLink = linked.get(item.id) ?? 0;
    const key = lineKey(item.description, item.unit_price);
    const pool = pools.get(key) ?? 0;
    const capacity = Math.max(0, poQty - fromLink);
    const fromPool = Math.min(capacity, pool);
    pools.set(key, pool - fromPool);
    const invoicedQuantity = roundQty(fromLink + fromPool);
    result.set(item.id, {
      invoicedQuantity,
      remainingQuantity: roundQty(Math.max(0, poQty - invoicedQuantity)),
    });
  }

  return result;
}
