-- Track which PO line items are confirmed to start work.
-- Existing rows default to confirmed so current totals stay unchanged.
ALTER TABLE purchase_order_items ADD COLUMN work_confirmed INTEGER NOT NULL DEFAULT 1;
