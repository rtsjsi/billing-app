-- Historical Invoices Import Script
-- Client: Cloudare Technologies
-- Date Generated: 2026-06-22T04:54:51.161Z

-- Clean up existing invoices for Cloudare Technologies to prevent duplicates
DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE client_id = (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1));
DELETE FROM payments WHERE invoice_id IN (SELECT id FROM invoices WHERE client_id = (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1));
DELETE FROM invoices WHERE client_id = (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1);


-- Invoice INV-1001
INSERT INTO invoices (invoice_number, client_id, po_id, issue_date, due_date, status, currency, subtotal, tax_label, tax_rate, tax_amount, discount_amount, total, amount_paid, notes, terms, created_at, updated_at)
VALUES (
  'INV-1001', 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  NULL, 
  '2025-07-17', 
  '2025-08-01', 
  'paid', 
  'INR', 
  50000, 
  'GST', 
  0, 
  0, 
  0, 
  50000, 
  50000, 
  'Historical data migration', 
  'Paid', 
  '2026-06-22T04:54:51.161Z', 
  '2026-06-22T04:54:51.161Z'
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-1001'), 
  'Craftsman ASN Changes', 
  1, 
  25000, 
  25000, 
  0
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-1001'), 
  'LSI Reports (Tunning and New Report)', 
  1, 
  15000, 
  15000, 
  1
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-1001'), 
  'LSI Reports (Partial)', 
  1, 
  10000, 
  10000, 
  2
);
INSERT INTO payments (invoice_id, amount, payment_date, method, reference, notes, created_at)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-1001'), 
  50000, 
  '2025-07-22', 
  'bank_transfer', 
  'TXN-INV-1001', 
  'Imported payment history', 
  '2026-06-22T04:54:51.161Z'
);

-- Invoice INV-1002
INSERT INTO invoices (invoice_number, client_id, po_id, issue_date, due_date, status, currency, subtotal, tax_label, tax_rate, tax_amount, discount_amount, total, amount_paid, notes, terms, created_at, updated_at)
VALUES (
  'INV-1002', 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  NULL, 
  '2025-08-20', 
  '2025-09-04', 
  'paid', 
  'INR', 
  50000, 
  'GST', 
  0, 
  0, 
  0, 
  50000, 
  50000, 
  'Historical data migration', 
  'Paid', 
  '2026-06-22T04:54:51.161Z', 
  '2026-06-22T04:54:51.161Z'
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-1002'), 
  'LSI Reports (Remaining)', 
  1, 
  30000, 
  30000, 
  0
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-1002'), 
  'Fadv Einvoice (Partial)', 
  1, 
  20000, 
  20000, 
  1
);
INSERT INTO payments (invoice_id, amount, payment_date, method, reference, notes, created_at)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-1002'), 
  50000, 
  '2025-08-25', 
  'bank_transfer', 
  'TXN-INV-1002', 
  'Imported payment history', 
  '2026-06-22T04:54:51.161Z'
);

-- Invoice INV-1003
INSERT INTO invoices (invoice_number, client_id, po_id, issue_date, due_date, status, currency, subtotal, tax_label, tax_rate, tax_amount, discount_amount, total, amount_paid, notes, terms, created_at, updated_at)
VALUES (
  'INV-1003', 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  NULL, 
  '2025-09-22', 
  '2025-10-07', 
  'paid', 
  'INR', 
  70000, 
  'GST', 
  0, 
  0, 
  0, 
  70000, 
  70000, 
  'Historical data migration', 
  'Paid', 
  '2026-06-22T04:54:51.161Z', 
  '2026-06-22T04:54:51.161Z'
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-1003'), 
  'Invoice (Sep-Oct 25)', 
  1, 
  70000, 
  70000, 
  0
);
INSERT INTO payments (invoice_id, amount, payment_date, method, reference, notes, created_at)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-1003'), 
  70000, 
  '2025-09-27', 
  'bank_transfer', 
  'TXN-INV-1003', 
  'Imported payment history', 
  '2026-06-22T04:54:51.161Z'
);

-- Invoice INV-1004
INSERT INTO invoices (invoice_number, client_id, po_id, issue_date, due_date, status, currency, subtotal, tax_label, tax_rate, tax_amount, discount_amount, total, amount_paid, notes, terms, created_at, updated_at)
VALUES (
  'INV-1004', 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  NULL, 
  '2025-10-20', 
  '2025-11-04', 
  'paid', 
  'INR', 
  70000, 
  'GST', 
  0, 
  0, 
  0, 
  70000, 
  70000, 
  'Historical data migration', 
  'Paid', 
  '2026-06-22T04:54:51.161Z', 
  '2026-06-22T04:54:51.161Z'
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-1004'), 
  'Invoice (Oct-Nov 25)', 
  1, 
  70000, 
  70000, 
  0
);
INSERT INTO payments (invoice_id, amount, payment_date, method, reference, notes, created_at)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-1004'), 
  70000, 
  '2025-10-25', 
  'bank_transfer', 
  'TXN-INV-1004', 
  'Imported payment history', 
  '2026-06-22T04:54:51.161Z'
);

-- Invoice INV-1005
INSERT INTO invoices (invoice_number, client_id, po_id, issue_date, due_date, status, currency, subtotal, tax_label, tax_rate, tax_amount, discount_amount, total, amount_paid, notes, terms, created_at, updated_at)
VALUES (
  'INV-1005', 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  NULL, 
  '2025-11-30', 
  '2025-12-15', 
  'paid', 
  'INR', 
  70000, 
  'GST', 
  0, 
  0, 
  0, 
  70000, 
  70000, 
  'Historical data migration', 
  'Paid', 
  '2026-06-22T04:54:51.161Z', 
  '2026-06-22T04:54:51.161Z'
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-1005'), 
  'Fadv Einvoice (Remaining)', 
  1, 
  70000, 
  70000, 
  0
);
INSERT INTO payments (invoice_id, amount, payment_date, method, reference, notes, created_at)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-1005'), 
  70000, 
  '2025-12-05', 
  'bank_transfer', 
  'TXN-INV-1005', 
  'Imported payment history', 
  '2026-06-22T04:54:51.161Z'
);

-- Invoice INV-1006
INSERT INTO invoices (invoice_number, client_id, po_id, issue_date, due_date, status, currency, subtotal, tax_label, tax_rate, tax_amount, discount_amount, total, amount_paid, notes, terms, created_at, updated_at)
VALUES (
  'INV-1006', 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  NULL, 
  '2026-01-20', 
  '2026-02-04', 
  'paid', 
  'INR', 
  40000, 
  'GST', 
  0, 
  0, 
  0, 
  40000, 
  40000, 
  'Historical data migration', 
  'Paid', 
  '2026-06-22T04:54:51.161Z', 
  '2026-06-22T04:54:51.161Z'
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-1006'), 
  'OSC Malaysia BIP for EINV', 
  1, 
  40000, 
  40000, 
  0
);
INSERT INTO payments (invoice_id, amount, payment_date, method, reference, notes, created_at)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-1006'), 
  40000, 
  '2026-01-25', 
  'bank_transfer', 
  'TXN-INV-1006', 
  'Imported payment history', 
  '2026-06-22T04:54:51.161Z'
);

-- Invoice INV-1007
INSERT INTO invoices (invoice_number, client_id, po_id, issue_date, due_date, status, currency, subtotal, tax_label, tax_rate, tax_amount, discount_amount, total, amount_paid, notes, terms, created_at, updated_at)
VALUES (
  'INV-1007', 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  NULL, 
  '2026-02-01', 
  '2026-02-16', 
  'paid', 
  'INR', 
  17355, 
  'GST', 
  0, 
  0, 
  0, 
  17355, 
  17355, 
  'Historical data migration', 
  'Paid', 
  '2026-06-22T04:54:51.161Z', 
  '2026-06-22T04:54:51.161Z'
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-1007'), 
  'Kota Visit', 
  1, 
  17355, 
  17355, 
  0
);
INSERT INTO payments (invoice_id, amount, payment_date, method, reference, notes, created_at)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-1007'), 
  17355, 
  '2026-02-06', 
  'bank_transfer', 
  'TXN-INV-1007', 
  'Imported payment history', 
  '2026-06-22T04:54:51.161Z'
);

-- Invoice INV-1008
INSERT INTO invoices (invoice_number, client_id, po_id, issue_date, due_date, status, currency, subtotal, tax_label, tax_rate, tax_amount, discount_amount, total, amount_paid, notes, terms, created_at, updated_at)
VALUES (
  'INV-1008', 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  NULL, 
  '2026-02-26', 
  '2026-03-13', 
  'paid', 
  'INR', 
  59000, 
  'GST', 
  0, 
  0, 
  0, 
  59000, 
  59000, 
  'Historical data migration', 
  'Paid', 
  '2026-06-22T04:54:51.161Z', 
  '2026-06-22T04:54:51.161Z'
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-1008'), 
  'LSI Journal Ledger Report', 
  1, 
  45000, 
  45000, 
  0
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-1008'), 
  'LSI TID Report', 
  1, 
  10000, 
  10000, 
  1
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-1008'), 
  'Add Project Status as parameter in LSI Project Cost with Distribution Details Report', 
  1, 
  4000, 
  4000, 
  2
);
INSERT INTO payments (invoice_id, amount, payment_date, method, reference, notes, created_at)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-1008'), 
  59000, 
  '2026-03-03', 
  'bank_transfer', 
  'TXN-INV-1008', 
  'Imported payment history', 
  '2026-06-22T04:54:51.161Z'
);

-- Invoice INV-1009
INSERT INTO invoices (invoice_number, client_id, po_id, issue_date, due_date, status, currency, subtotal, tax_label, tax_rate, tax_amount, discount_amount, total, amount_paid, notes, terms, created_at, updated_at)
VALUES (
  'INV-1009', 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  NULL, 
  '2026-03-30', 
  '2026-04-14', 
  'paid', 
  'INR', 
  55000, 
  'GST', 
  0, 
  0, 
  0, 
  55000, 
  55000, 
  'Historical data migration', 
  'Paid', 
  '2026-06-22T04:54:51.161Z', 
  '2026-06-22T04:54:51.161Z'
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-1009'), 
  'LSI TID Report With Supplier Parameter (CR for Sorting)', 
  1, 
  10000, 
  10000, 
  0
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-1009'), 
  'CT SR and PR Performance Issue', 
  1, 
  10000, 
  10000, 
  1
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-1009'), 
  'Add Transaction Finish Date as parameter in LSI Project Cost with Distribution Details Report', 
  1, 
  5000, 
  5000, 
  2
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-1009'), 
  'CT SR and PR Changes', 
  1, 
  10000, 
  10000, 
  3
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-1009'), 
  'LSI TID Report New Requirement from Saurabh', 
  1, 
  10000, 
  10000, 
  4
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-1009'), 
  'LSI Asset Register Change Needed from Jacque', 
  1, 
  10000, 
  10000, 
  5
);
INSERT INTO payments (invoice_id, amount, payment_date, method, reference, notes, created_at)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-1009'), 
  55000, 
  '2026-04-04', 
  'bank_transfer', 
  'TXN-INV-1009', 
  'Imported payment history', 
  '2026-06-22T04:54:51.161Z'
);

-- Invoice INV-202627-1001
INSERT INTO invoices (invoice_number, client_id, po_id, issue_date, due_date, status, currency, subtotal, tax_label, tax_rate, tax_amount, discount_amount, total, amount_paid, notes, terms, created_at, updated_at)
VALUES (
  'INV-202627-1001', 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  NULL, 
  '2026-05-01', 
  '2026-05-16', 
  'paid', 
  'INR', 
  60000, 
  'GST', 
  0, 
  0, 
  0, 
  60000, 
  60000, 
  'Historical data migration', 
  'Paid', 
  '2026-06-22T04:54:51.161Z', 
  '2026-06-22T04:54:51.161Z'
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-202627-1001'), 
  'Fadv Einvoice Design Change and AP', 
  1, 
  60000, 
  60000, 
  0
);
INSERT INTO payments (invoice_id, amount, payment_date, method, reference, notes, created_at)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-202627-1001'), 
  60000, 
  '2026-05-06', 
  'bank_transfer', 
  'TXN-INV-202627-1001', 
  'Imported payment history', 
  '2026-06-22T04:54:51.161Z'
);

-- Update settings next invoice number
UPDATE business_settings SET invoice_next_number = 1002, updated_at = '2026-06-22T04:54:51.161Z' WHERE id = 1;
