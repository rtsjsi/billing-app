CREATE INDEX IF NOT EXISTS idx_clients_user ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_po_user ON purchase_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);

CREATE TRIGGER IF NOT EXISTS prevent_invoice_overpayment
BEFORE INSERT ON payments
WHEN NEW.amount > (
  SELECT total - COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = NEW.invoice_id), 0) + 0.001
  FROM invoices WHERE id = NEW.invoice_id
)
BEGIN
  SELECT RAISE(ABORT, 'Payment exceeds remaining invoice balance');
END;
