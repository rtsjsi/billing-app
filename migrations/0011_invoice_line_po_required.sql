CREATE TRIGGER IF NOT EXISTS prevent_invoice_item_without_po_line_insert
BEFORE INSERT ON invoice_items
WHEN NEW.po_item_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'Invoice line must be linked to a purchase order line');
END;

CREATE TRIGGER IF NOT EXISTS prevent_invoice_item_po_line_unlink
BEFORE UPDATE OF po_item_id ON invoice_items
WHEN NEW.po_item_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'Invoice line must be linked to a purchase order line');
END;
