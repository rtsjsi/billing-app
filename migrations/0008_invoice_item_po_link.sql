ALTER TABLE invoice_items ADD COLUMN po_item_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_invoice_items_po_item ON invoice_items(po_item_id);

-- Link existing PO invoice lines when description and price match one PO row.
UPDATE invoice_items
SET po_item_id = (
  SELECT poi.id
  FROM purchase_order_items poi
  JOIN invoices i ON i.id = invoice_items.invoice_id
  WHERE i.po_id = poi.po_id
    AND TRIM(poi.description) = TRIM(invoice_items.description)
    AND ABS(poi.unit_price - invoice_items.unit_price) < 0.0001
    AND (
      SELECT COUNT(*)
      FROM purchase_order_items poi2
      WHERE poi2.po_id = poi.po_id
        AND TRIM(poi2.description) = TRIM(poi.description)
        AND ABS(poi2.unit_price - poi.unit_price) < 0.0001
    ) = 1
  LIMIT 1
)
WHERE po_item_id IS NULL
  AND EXISTS (
    SELECT 1 FROM invoices i
    WHERE i.id = invoice_items.invoice_id AND i.po_id IS NOT NULL
  );
