CREATE TRIGGER IF NOT EXISTS prevent_invoice_without_po_insert
BEFORE INSERT ON invoices
WHEN NEW.po_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'Purchase Order is required');
END;

CREATE TRIGGER IF NOT EXISTS prevent_invoice_po_unlink
BEFORE UPDATE OF po_id ON invoices
WHEN NEW.po_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'Purchase Order is required');
END;
