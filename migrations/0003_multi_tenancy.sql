-- Create new business_settings table without the CHECK (id = 1) constraint
-- and add user_id column
CREATE TABLE business_settings_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
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
  updated_at TEXT NOT NULL,
  UNIQUE(user_id)
);

-- Copy existing data to the new table, assuming it belongs to user_id 1
INSERT INTO business_settings_new (
  user_id, business_name, owner_name, email, phone, address, gstin, pan,
  bank_account_name, bank_account_number, bank_ifsc, bank_name, upi_id,
  currency, tax_label, default_tax_rate, invoice_prefix, invoice_next_number,
  invoice_number_reset, default_payment_terms_days, default_notes, default_terms, updated_at
)
SELECT 
  1, business_name, owner_name, email, phone, address, gstin, pan,
  bank_account_name, bank_account_number, bank_ifsc, bank_name, upi_id,
  currency, tax_label, default_tax_rate, invoice_prefix, invoice_next_number,
  invoice_number_reset, default_payment_terms_days, default_notes, default_terms, updated_at
FROM business_settings;

-- Drop old table and rename the new one
DROP TABLE business_settings;
ALTER TABLE business_settings_new RENAME TO business_settings;

-- Add user_id to clients, purchase_orders, and invoices
-- We use DEFAULT 1 to satisfy the NOT NULL constraint for existing data
ALTER TABLE clients ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE purchase_orders ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE invoices ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1;
