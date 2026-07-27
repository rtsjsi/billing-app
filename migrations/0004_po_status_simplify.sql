-- Normalize PO statuses: remove partially_invoiced, rename fulfilled → closed
UPDATE purchase_orders SET status = 'closed' WHERE status = 'fulfilled';
UPDATE purchase_orders SET status = 'open' WHERE status = 'partially_invoiced';
