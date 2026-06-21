export const SCHEMA_SQL = `
-- Single business profile row (id is always 1)
CREATE TABLE IF NOT EXISTS business_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  business_name TEXT NOT NULL,
  owner_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  gstin TEXT,
  pan TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_ifsc TEXT,
  bank_name TEXT,
  upi_id TEXT,
  currency TEXT NOT NULL DEFAULT 'INR',
  tax_label TEXT NOT NULL DEFAULT 'GST',
  default_tax_rate REAL NOT NULL DEFAULT 0,
  invoice_prefix TEXT NOT NULL DEFAULT 'INV-',
  invoice_next_number INTEGER NOT NULL DEFAULT 1,
  invoice_number_reset TEXT NOT NULL DEFAULT 'financial_year',
  default_payment_terms_days INTEGER NOT NULL DEFAULT 15,
  default_notes TEXT,
  default_terms TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clients (
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
CREATE INDEX IF NOT EXISTS idx_clients_archived ON clients(is_archived);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  po_number TEXT NOT NULL,
  po_date TEXT,
  description TEXT,
  amount REAL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'open',
  attachment_key TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_po_client ON purchase_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT NOT NULL UNIQUE,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  po_id INTEGER REFERENCES purchase_orders(id),
  issue_date TEXT NOT NULL,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
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
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);

CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  amount REAL NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_items_invoice ON invoice_items(invoice_id);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  payment_date TEXT NOT NULL,
  method TEXT,
  reference TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);

-- Seed initial business profile
INSERT OR IGNORE INTO business_settings (
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
`;
