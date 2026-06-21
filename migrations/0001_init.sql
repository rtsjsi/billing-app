-- Single business profile row (id is always 1)
CREATE TABLE business_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  business_name TEXT NOT NULL,
  owner_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  gstin TEXT,                          -- optional, India GST number; leave blank if not registered
  pan TEXT,                            -- optional
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_ifsc TEXT,
  bank_name TEXT,
  upi_id TEXT,
  currency TEXT NOT NULL DEFAULT 'INR',
  tax_label TEXT NOT NULL DEFAULT 'GST',     -- shown on invoices; swap to VAT/Tax/etc if needed
  default_tax_rate REAL NOT NULL DEFAULT 0,  -- percentage, e.g. 18 for 18%
  invoice_prefix TEXT NOT NULL DEFAULT 'INV-',
  invoice_next_number INTEGER NOT NULL DEFAULT 1,
  invoice_number_reset TEXT NOT NULL DEFAULT 'financial_year', -- 'never' | 'calendar_year' | 'financial_year'
  default_payment_terms_days INTEGER NOT NULL DEFAULT 15,
  default_notes TEXT,
  default_terms TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  billing_address TEXT,
  gstin TEXT,
  notes TEXT,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_clients_archived ON clients(is_archived);
CREATE INDEX idx_clients_name ON clients(name);

CREATE TABLE purchase_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  po_number TEXT NOT NULL,
  po_date TEXT,
  description TEXT,
  amount REAL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'open',     -- open | partially_invoiced | fulfilled | cancelled
  attachment_key TEXT,                      -- optional R2 object key, if attachments implemented
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_po_client ON purchase_orders(client_id);
CREATE INDEX idx_po_status ON purchase_orders(status);

CREATE TABLE invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT NOT NULL UNIQUE,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  po_id INTEGER REFERENCES purchase_orders(id),
  issue_date TEXT NOT NULL,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'draft',   -- draft | sent | partially_paid | paid | overdue | cancelled
  currency TEXT NOT NULL DEFAULT 'INR',
  subtotal REAL NOT NULL DEFAULT 0,
  tax_label TEXT,
  tax_rate REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  discount_amount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  amount_paid REAL NOT NULL DEFAULT 0,
  notes TEXT,
  terms TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date);

CREATE TABLE invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  amount REAL NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_items_invoice ON invoice_items(invoice_id);

CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  payment_date TEXT NOT NULL,
  method TEXT,           -- bank_transfer | upi | cash | cheque | other
  reference TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);

-- Seed initial business profile
INSERT INTO business_settings (
  id,
  business_name,
  owner_name,
  email,
  phone,
  address,
  currency,
  tax_label,
  default_tax_rate,
  invoice_prefix,
  invoice_next_number,
  invoice_number_reset,
  default_payment_terms_days,
  default_notes,
  default_terms,
  updated_at
) VALUES (
  1,
  'Freelancer Business',
  '',
  '',
  '',
  '',
  'INR',
  'GST',
  18.0,
  'INV-',
  1,
  'financial_year',
  15,
  'Thank you for your business!',
  'Please pay within payment terms. Bank account details listed above.',
  '2026-06-21T12:00:00Z'
);
