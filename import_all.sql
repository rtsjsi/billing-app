-- Historical Invoices & POs Import Script
-- Client: Cloudare Technologies
-- Date Generated: 2026-06-22T05:04:18.725Z

-- Clean up existing tables to prevent duplicates
DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE client_id = (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1));
DELETE FROM payments WHERE invoice_id IN (SELECT id FROM invoices WHERE client_id = (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1));
DELETE FROM invoices WHERE client_id = (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1);
DELETE FROM purchase_orders WHERE client_id = (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1);

-- 1. Create Purchase Orders (Projects)
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  1, 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  'PO-001', 
  '2025-04-01', 
  'Craftsman ASN Changes', 
  25000, 
  'INR', 
  'fulfilled', 
  NULL, 
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
);
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  2, 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  'PO-002', 
  '2025-04-01', 
  'Fadv Einvoice', 
  90000, 
  'INR', 
  'fulfilled', 
  NULL, 
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
);
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  3, 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  'PO-003', 
  '2025-04-01', 
  'LSI Reports', 
  40000, 
  'INR', 
  'fulfilled', 
  'Added 15k in Original Amount for Extra Efforts', 
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
);
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  4, 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  'PO-004', 
  '2025-04-01', 
  'LSI Reports (Tunning and New Report)', 
  15000, 
  'INR', 
  'fulfilled', 
  'As discussed on WP', 
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
);
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  5, 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  'PO-005', 
  '2025-04-01', 
  'Invoice (Sep-Oct 25)', 
  70000, 
  'INR', 
  'fulfilled', 
  NULL, 
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
);
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  6, 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  'PO-006', 
  '2025-04-01', 
  'Invoice (Oct-Nov 25)', 
  70000, 
  'INR', 
  'fulfilled', 
  NULL, 
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
);
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  7, 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  'PO-007', 
  '2026-04-01', 
  'Fadv Einvoice Design Change and AP', 
  60000, 
  'INR', 
  'fulfilled', 
  'Will add aditional 5k for efforts due to frequent cloning ', 
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
);
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  8, 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  'PO-008', 
  '2025-04-01', 
  'LSI TID Report', 
  10000, 
  'INR', 
  'fulfilled', 
  NULL, 
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
);
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  9, 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  'PO-009', 
  '2025-04-01', 
  'LSI Journal Ledger Report', 
  45000, 
  'INR', 
  'fulfilled', 
  '5k Added for New Req from Sabrina on 02Apr2026', 
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
);
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  10, 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  'PO-010', 
  '2025-04-01', 
  'Kota Visit', 
  17355, 
  'INR', 
  'fulfilled', 
  NULL, 
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
);
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  11, 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  'PO-011', 
  '2025-04-01', 
  'Add Transaction Finish Date as paraeter in LSI Project Cost with Distribution Details Report', 
  5000, 
  'INR', 
  'fulfilled', 
  NULL, 
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
);
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  12, 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  'PO-012', 
  '2025-04-01', 
  'LSI TID Report With Supplier Parameter (CR for Sorting)', 
  10000, 
  'INR', 
  'fulfilled', 
  NULL, 
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
);
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  13, 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  'PO-013', 
  '2025-04-01', 
  'CT SR and PR Performance Issue', 
  10000, 
  'INR', 
  'fulfilled', 
  NULL, 
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
);
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  14, 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  'PO-014', 
  '2025-04-01', 
  'Add Project Status as paraeter in LSI Project Cost with Distribution Details Report', 
  4000, 
  'INR', 
  'fulfilled', 
  NULL, 
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
);
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  15, 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  'PO-015', 
  '2025-04-01', 
  'OSC Malaysia BIP for EINV', 
  40000, 
  'INR', 
  'fulfilled', 
  NULL, 
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
);
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  16, 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  'PO-016', 
  '2025-04-01', 
  'CT SR and PR Changes', 
  10000, 
  'INR', 
  'fulfilled', 
  NULL, 
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
);
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  17, 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  'PO-017', 
  '2025-04-01', 
  'LSI TID Report New Requirement from Saurabh', 
  10000, 
  'INR', 
  'fulfilled', 
  'Incorporate sort by "Natural Account". \nPlease look into the sort by amount. I dont think that is working.\ninclude another parameter for "Customer Number" and incorporate search based on that. This would be same as our vendor number search but the results would be more on the AR side.', 
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
);
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  18, 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  'PO-018', 
  '2025-04-01', 
  'LSI Asset Register Change Needed from Jacque', 
  10000, 
  'INR', 
  'fulfilled', 
  NULL, 
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
);
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  19, 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  'PO-019', 
  '2025-04-01', 
  'Changes in Retail Statement Report', 
  10000, 
  'INR', 
  'open', 
  '* Add page numbers in the footer\n* Exclude zero-dollar transactions\n* Merge customer transactions into a single consolidated table', 
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
);
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  20, 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  'PO-020', 
  '2025-04-01', 
  'Changes in LSI Ageing Report', 
  5000, 
  'INR', 
  'open', 
  '* Add customer account description\n* Consolidate lines by customer', 
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
);
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  21, 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  'PO-021', 
  '2026-05-01', 
  'Chalhoub UAE AR', 
  250000, 
  'INR', 
  'open', 
  NULL, 
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
);
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  22, 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  'PO-022', 
  '2026-05-01', 
  'Chalhoub UAE AP', 
  80000, 
  'INR', 
  'open', 
  NULL, 
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
);
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  23, 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  'PO-023', 
  '2026-05-01', 
  'Chalhoub Oman AR', 
  125000, 
  'INR', 
  'open', 
  NULL, 
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
);
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  24, 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  'PO-024', 
  '2026-05-01', 
  'Chalhoub Oman AP', 
  45000, 
  'INR', 
  'open', 
  NULL, 
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
);

-- 2. Create Invoices, Invoice Items and Payments

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
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
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
  '2026-06-22T05:04:18.725Z'
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
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
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
  '2026-06-22T05:04:18.725Z'
);

-- Invoice INV-1003
INSERT INTO invoices (invoice_number, client_id, po_id, issue_date, due_date, status, currency, subtotal, tax_label, tax_rate, tax_amount, discount_amount, total, amount_paid, notes, terms, created_at, updated_at)
VALUES (
  'INV-1003', 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  5, 
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
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
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
  '2026-06-22T05:04:18.725Z'
);

-- Invoice INV-1004
INSERT INTO invoices (invoice_number, client_id, po_id, issue_date, due_date, status, currency, subtotal, tax_label, tax_rate, tax_amount, discount_amount, total, amount_paid, notes, terms, created_at, updated_at)
VALUES (
  'INV-1004', 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  6, 
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
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
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
  '2026-06-22T05:04:18.725Z'
);

-- Invoice INV-1005
INSERT INTO invoices (invoice_number, client_id, po_id, issue_date, due_date, status, currency, subtotal, tax_label, tax_rate, tax_amount, discount_amount, total, amount_paid, notes, terms, created_at, updated_at)
VALUES (
  'INV-1005', 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  2, 
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
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
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
  '2026-06-22T05:04:18.725Z'
);

-- Invoice INV-1006
INSERT INTO invoices (invoice_number, client_id, po_id, issue_date, due_date, status, currency, subtotal, tax_label, tax_rate, tax_amount, discount_amount, total, amount_paid, notes, terms, created_at, updated_at)
VALUES (
  'INV-1006', 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  15, 
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
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
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
  '2026-06-22T05:04:18.725Z'
);

-- Invoice INV-1007
INSERT INTO invoices (invoice_number, client_id, po_id, issue_date, due_date, status, currency, subtotal, tax_label, tax_rate, tax_amount, discount_amount, total, amount_paid, notes, terms, created_at, updated_at)
VALUES (
  'INV-1007', 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  10, 
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
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
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
  '2026-06-22T05:04:18.725Z'
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
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
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
  '2026-06-22T05:04:18.725Z'
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
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
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
  '2026-06-22T05:04:18.725Z'
);

-- Invoice INV-202627-1001
INSERT INTO invoices (invoice_number, client_id, po_id, issue_date, due_date, status, currency, subtotal, tax_label, tax_rate, tax_amount, discount_amount, total, amount_paid, notes, terms, created_at, updated_at)
VALUES (
  'INV-202627-1001', 
  (SELECT id FROM clients WHERE name LIKE '%Cloudare Technologies%' LIMIT 1), 
  7, 
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
  '2026-06-22T05:04:18.725Z', 
  '2026-06-22T05:04:18.725Z'
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
  '2026-06-22T05:04:18.725Z'
);

-- Update settings next invoice number
UPDATE business_settings SET invoice_next_number = 1002, updated_at = '2026-06-22T05:04:18.725Z' WHERE id = 1;
