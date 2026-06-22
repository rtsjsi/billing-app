-- Historical Invoices & POs Import Script
-- Client: MastersIndia IT Solutions Private Limited
-- Date Generated: 2026-06-22T05:22:09.616Z

-- Clean up existing tables to prevent duplicates
DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE client_id = (SELECT id FROM clients WHERE name LIKE '%MastersIndia%' LIMIT 1));
DELETE FROM payments WHERE invoice_id IN (SELECT id FROM invoices WHERE client_id = (SELECT id FROM clients WHERE name LIKE '%MastersIndia%' LIMIT 1));
DELETE FROM invoices WHERE client_id = (SELECT id FROM clients WHERE name LIKE '%MastersIndia%' LIMIT 1);
DELETE FROM purchase_orders WHERE client_id = (SELECT id FROM clients WHERE name LIKE '%MastersIndia%' LIMIT 1);

-- 1. Create Purchase Orders (Projects)
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  101, 
  (SELECT id FROM clients WHERE name LIKE '%MastersIndia%' LIMIT 1), 
  'PO-101', 
  '2024-04-01', 
  'Motherson Reload Activity ', 
  30000, 
  'INR', 
  'fulfilled', 
  'And 10K remaining from Kunal other than this, revised to 30k due to additional email requirement', 
  '2026-06-22T05:22:09.616Z', 
  '2026-06-22T05:22:09.616Z'
);
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  102, 
  (SELECT id FROM clients WHERE name LIKE '%MastersIndia%' LIMIT 1), 
  'PO-102', 
  '2024-04-01', 
  'Max issues - Additional', 
  10000, 
  'INR', 
  'fulfilled', 
  NULL, 
  '2026-06-22T05:22:09.616Z', 
  '2026-06-22T05:22:09.616Z'
);
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  103, 
  (SELECT id FROM clients WHERE name LIKE '%MastersIndia%' LIMIT 1), 
  'PO-103', 
  '2024-04-01', 
  'Alana IRN List Project', 
  125000, 
  'INR', 
  'fulfilled', 
  NULL, 
  '2026-06-22T05:22:09.616Z', 
  '2026-06-22T05:22:09.616Z'
);
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  104, 
  (SELECT id FROM clients WHERE name LIKE '%MastersIndia%' LIMIT 1), 
  'PO-104', 
  '2024-04-01', 
  'Adhoc Work', 
  4000, 
  'INR', 
  'fulfilled', 
  '1. Analysis for new Client and Screenshots for Debit and Credit Memo (25-11-2024 2 Hrs) 2. Allana Issue resolved over a call (1 Hour) 3. Allana Issue 27-Dec-2024 Call and bugfix (1hour)', 
  '2026-06-22T05:22:09.616Z', 
  '2026-06-22T05:22:09.616Z'
);
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  105, 
  (SELECT id FROM clients WHERE name LIKE '%MastersIndia%' LIMIT 1), 
  'PO-105', 
  '2025-04-01', 
  'BGPPL GST AMC (PO/24-25/077) (1st Feb,2025 to 31st Jan,2026)', 
  100000, 
  'INR', 
  'fulfilled', 
  NULL, 
  '2026-06-22T05:22:09.616Z', 
  '2026-06-22T05:22:09.616Z'
);
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  106, 
  (SELECT id FROM clients WHERE name LIKE '%MastersIndia%' LIMIT 1), 
  'PO-106', 
  '2024-04-01', 
  'BGPPL Adhoc Work (Add Two Fields in Integration)', 
  10000, 
  'INR', 
  'fulfilled', 
  'Voucer Number and GL Date is added In Purchase File as well as Recon files', 
  '2026-06-22T05:22:09.616Z', 
  '2026-06-22T05:22:09.616Z'
);
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  107, 
  (SELECT id FROM clients WHERE name LIKE '%MastersIndia%' LIMIT 1), 
  'PO-107', 
  '2025-04-01', 
  'Motherson Work (PO/25-26/007)', 
  40000, 
  'INR', 
  'fulfilled', 
  NULL, 
  '2026-06-22T05:22:09.616Z', 
  '2026-06-22T05:22:09.616Z'
);
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  108, 
  (SELECT id FROM clients WHERE name LIKE '%MastersIndia%' LIMIT 1), 
  'PO-108', 
  '2025-04-01', 
  'Motherson PROD Deployment', 
  20000, 
  'INR', 
  'fulfilled', 
  NULL, 
  '2026-06-22T05:22:09.616Z', 
  '2026-06-22T05:22:09.616Z'
);
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  109, 
  (SELECT id FROM clients WHERE name LIKE '%MastersIndia%' LIMIT 1), 
  'PO-109', 
  '2025-04-01', 
  'Motherson Change Request for Email Notification + Bugfix on 11032026 + Bugfix on 18052026', 
  35000, 
  'INR', 
  'partially_invoiced', 
  NULL, 
  '2026-06-22T05:22:09.616Z', 
  '2026-06-22T05:22:09.616Z'
);
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  110, 
  (SELECT id FROM clients WHERE name LIKE '%MastersIndia%' LIMIT 1), 
  'PO-110', 
  '2025-04-01', 
  'Portscape AMC', 
  80000, 
  'INR', 
  'partially_invoiced', 
  NULL, 
  '2026-06-22T05:22:09.616Z', 
  '2026-06-22T05:22:09.616Z'
);
INSERT INTO purchase_orders (id, client_id, po_number, po_date, description, amount, currency, status, notes, created_at, updated_at)
VALUES (
  111, 
  (SELECT id FROM clients WHERE name LIKE '%MastersIndia%' LIMIT 1), 
  'PO-111', 
  '2025-04-01', 
  'BGPPL AMC (1st June, 2026, and end on 31st May, 2027)', 
  120000, 
  'INR', 
  'open', 
  NULL, 
  '2026-06-22T05:22:09.616Z', 
  '2026-06-22T05:22:09.616Z'
);

-- 2. Create Invoices, Invoice Items and Payments

-- Invoice INV-002
INSERT INTO invoices (invoice_number, client_id, po_id, issue_date, due_date, status, currency, subtotal, tax_label, tax_rate, tax_amount, discount_amount, total, amount_paid, notes, terms, created_at, updated_at)
VALUES (
  'INV-002', 
  (SELECT id FROM clients WHERE name LIKE '%MastersIndia%' LIMIT 1), 
  103, 
  '2024-09-24', 
  '2024-10-09', 
  'paid', 
  'INR', 
  31250, 
  'GST', 
  0, 
  0, 
  0, 
  31250, 
  31250, 
  'Historical data migration', 
  'Paid', 
  '2026-06-22T05:22:09.616Z', 
  '2026-06-22T05:22:09.616Z'
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-002'), 
  'Alana IRN List Project (Milestone 1)', 
  1, 
  31250, 
  31250, 
  0
);
INSERT INTO payments (invoice_id, amount, payment_date, method, reference, notes, created_at)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-002'), 
  31250, 
  '2024-09-29', 
  'bank_transfer', 
  'TXN-INV-002', 
  'Imported payment history', 
  '2026-06-22T05:22:09.616Z'
);

-- Invoice INV-004
INSERT INTO invoices (invoice_number, client_id, po_id, issue_date, due_date, status, currency, subtotal, tax_label, tax_rate, tax_amount, discount_amount, total, amount_paid, notes, terms, created_at, updated_at)
VALUES (
  'INV-004', 
  (SELECT id FROM clients WHERE name LIKE '%MastersIndia%' LIMIT 1), 
  103, 
  '2024-10-21', 
  '2024-11-05', 
  'paid', 
  'INR', 
  62500, 
  'GST', 
  0, 
  0, 
  0, 
  62500, 
  62500, 
  'Historical data migration', 
  'Paid', 
  '2026-06-22T05:22:09.616Z', 
  '2026-06-22T05:22:09.616Z'
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-004'), 
  'Alana IRN List Project (Milestone 2)', 
  1, 
  62500, 
  62500, 
  0
);
INSERT INTO payments (invoice_id, amount, payment_date, method, reference, notes, created_at)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-004'), 
  62500, 
  '2024-10-26', 
  'bank_transfer', 
  'TXN-INV-004', 
  'Imported payment history', 
  '2026-06-22T05:22:09.616Z'
);

-- Invoice INV-005
INSERT INTO invoices (invoice_number, client_id, po_id, issue_date, due_date, status, currency, subtotal, tax_label, tax_rate, tax_amount, discount_amount, total, amount_paid, notes, terms, created_at, updated_at)
VALUES (
  'INV-005', 
  (SELECT id FROM clients WHERE name LIKE '%MastersIndia%' LIMIT 1), 
  103, 
  '2024-10-21', 
  '2024-11-05', 
  'paid', 
  'INR', 
  12500, 
  'GST', 
  0, 
  0, 
  0, 
  12500, 
  12500, 
  'Historical data migration', 
  'Paid', 
  '2026-06-22T05:22:09.616Z', 
  '2026-06-22T05:22:09.616Z'
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-005'), 
  'Alana IRN List Project (Milestone 3)', 
  1, 
  12500, 
  12500, 
  0
);
INSERT INTO payments (invoice_id, amount, payment_date, method, reference, notes, created_at)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-005'), 
  12500, 
  '2024-10-26', 
  'bank_transfer', 
  'TXN-INV-005', 
  'Imported payment history', 
  '2026-06-22T05:22:09.616Z'
);

-- Invoice INV-006
INSERT INTO invoices (invoice_number, client_id, po_id, issue_date, due_date, status, currency, subtotal, tax_label, tax_rate, tax_amount, discount_amount, total, amount_paid, notes, terms, created_at, updated_at)
VALUES (
  'INV-006', 
  (SELECT id FROM clients WHERE name LIKE '%MastersIndia%' LIMIT 1), 
  101, 
  '2024-10-21', 
  '2024-11-05', 
  'paid', 
  'INR', 
  5000, 
  'GST', 
  0, 
  0, 
  0, 
  5000, 
  5000, 
  'Historical data migration', 
  'Paid', 
  '2026-06-22T05:22:09.616Z', 
  '2026-06-22T05:22:09.616Z'
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-006'), 
  'Motherson Reload Activity (Part 1)', 
  1, 
  5000, 
  5000, 
  0
);
INSERT INTO payments (invoice_id, amount, payment_date, method, reference, notes, created_at)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-006'), 
  5000, 
  '2024-10-26', 
  'bank_transfer', 
  'TXN-INV-006', 
  'Imported payment history', 
  '2026-06-22T05:22:09.616Z'
);

-- Invoice INV-007
INSERT INTO invoices (invoice_number, client_id, po_id, issue_date, due_date, status, currency, subtotal, tax_label, tax_rate, tax_amount, discount_amount, total, amount_paid, notes, terms, created_at, updated_at)
VALUES (
  'INV-007', 
  (SELECT id FROM clients WHERE name LIKE '%MastersIndia%' LIMIT 1), 
  NULL, 
  '2024-11-12', 
  '2024-11-27', 
  'paid', 
  'INR', 
  32500, 
  'GST', 
  0, 
  0, 
  0, 
  32500, 
  32500, 
  'Historical data migration', 
  'Paid', 
  '2026-06-22T05:22:09.616Z', 
  '2026-06-22T05:22:09.616Z'
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-007'), 
  'Alana IRN List Project (Final Milestone)', 
  1, 
  18750, 
  18750, 
  0
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-007'), 
  'Max issues - Additional', 
  1, 
  10000, 
  10000, 
  1
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-007'), 
  'Adhoc Work (Part 1)', 
  1, 
  3750, 
  3750, 
  2
);
INSERT INTO payments (invoice_id, amount, payment_date, method, reference, notes, created_at)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-007'), 
  32500, 
  '2024-11-17', 
  'bank_transfer', 
  'TXN-INV-007', 
  'Imported payment history', 
  '2026-06-22T05:22:09.616Z'
);

-- Invoice INV-008
INSERT INTO invoices (invoice_number, client_id, po_id, issue_date, due_date, status, currency, subtotal, tax_label, tax_rate, tax_amount, discount_amount, total, amount_paid, notes, terms, created_at, updated_at)
VALUES (
  'INV-008', 
  (SELECT id FROM clients WHERE name LIKE '%MastersIndia%' LIMIT 1), 
  NULL, 
  '2025-01-01', 
  '2025-01-16', 
  'paid', 
  'INR', 
  26500, 
  'GST', 
  0, 
  0, 
  0, 
  26500, 
  26500, 
  'Historical data migration', 
  'Paid', 
  '2026-06-22T05:22:09.616Z', 
  '2026-06-22T05:22:09.616Z'
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-008'), 
  'Portscape AMC (Part 1)', 
  1, 
  20000, 
  20000, 
  0
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-008'), 
  'BGPPL Adhoc Work (Part 1)', 
  1, 
  5000, 
  5000, 
  1
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-008'), 
  'Adhoc Work (Part 2)', 
  1, 
  1500, 
  1500, 
  2
);
INSERT INTO payments (invoice_id, amount, payment_date, method, reference, notes, created_at)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-008'), 
  26500, 
  '2025-01-06', 
  'bank_transfer', 
  'TXN-INV-008', 
  'Imported payment history', 
  '2026-06-22T05:22:09.616Z'
);

-- Invoice INV-009
INSERT INTO invoices (invoice_number, client_id, po_id, issue_date, due_date, status, currency, subtotal, tax_label, tax_rate, tax_amount, discount_amount, total, amount_paid, notes, terms, created_at, updated_at)
VALUES (
  'INV-009', 
  (SELECT id FROM clients WHERE name LIKE '%MastersIndia%' LIMIT 1), 
  101, 
  '2025-02-15', 
  '2025-03-02', 
  'paid', 
  'INR', 
  25000, 
  'GST', 
  0, 
  0, 
  0, 
  25000, 
  25000, 
  'Historical data migration', 
  'Paid', 
  '2026-06-22T05:22:09.616Z', 
  '2026-06-22T05:22:09.616Z'
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-009'), 
  'Motherson Reload Activity (Part 2)', 
  1, 
  25000, 
  25000, 
  0
);
INSERT INTO payments (invoice_id, amount, payment_date, method, reference, notes, created_at)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-009'), 
  25000, 
  '2025-02-20', 
  'bank_transfer', 
  'TXN-INV-009', 
  'Imported payment history', 
  '2026-06-22T05:22:09.616Z'
);

-- Invoice INV-010
INSERT INTO invoices (invoice_number, client_id, po_id, issue_date, due_date, status, currency, subtotal, tax_label, tax_rate, tax_amount, discount_amount, total, amount_paid, notes, terms, created_at, updated_at)
VALUES (
  'INV-010', 
  (SELECT id FROM clients WHERE name LIKE '%MastersIndia%' LIMIT 1), 
  105, 
  '2025-03-01', 
  '2025-03-16', 
  'paid', 
  'INR', 
  10000, 
  'GST', 
  0, 
  0, 
  0, 
  10000, 
  10000, 
  'Historical data migration', 
  'Paid', 
  '2026-06-22T05:22:09.616Z', 
  '2026-06-22T05:22:09.616Z'
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-010'), 
  'BGPPL GST AMC (Milestone 1)', 
  1, 
  10000, 
  10000, 
  0
);
INSERT INTO payments (invoice_id, amount, payment_date, method, reference, notes, created_at)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-010'), 
  10000, 
  '2025-03-06', 
  'bank_transfer', 
  'TXN-INV-010', 
  'Imported payment history', 
  '2026-06-22T05:22:09.616Z'
);

-- Invoice INV-011
INSERT INTO invoices (invoice_number, client_id, po_id, issue_date, due_date, status, currency, subtotal, tax_label, tax_rate, tax_amount, discount_amount, total, amount_paid, notes, terms, created_at, updated_at)
VALUES (
  'INV-011', 
  (SELECT id FROM clients WHERE name LIKE '%MastersIndia%' LIMIT 1), 
  105, 
  '2025-05-01', 
  '2025-05-16', 
  'paid', 
  'INR', 
  45000, 
  'GST', 
  0, 
  0, 
  0, 
  45000, 
  45000, 
  'Historical data migration', 
  'Paid', 
  '2026-06-22T05:22:09.616Z', 
  '2026-06-22T05:22:09.616Z'
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-011'), 
  'BGPPL GST AMC (Milestone 2)', 
  1, 
  45000, 
  45000, 
  0
);
INSERT INTO payments (invoice_id, amount, payment_date, method, reference, notes, created_at)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-011'), 
  45000, 
  '2025-05-06', 
  'bank_transfer', 
  'TXN-INV-011', 
  'Imported payment history', 
  '2026-06-22T05:22:09.616Z'
);

-- Invoice INV-012
INSERT INTO invoices (invoice_number, client_id, po_id, issue_date, due_date, status, currency, subtotal, tax_label, tax_rate, tax_amount, discount_amount, total, amount_paid, notes, terms, created_at, updated_at)
VALUES (
  'INV-012', 
  (SELECT id FROM clients WHERE name LIKE '%MastersIndia%' LIMIT 1), 
  105, 
  '2025-08-01', 
  '2025-08-16', 
  'paid', 
  'INR', 
  45000, 
  'GST', 
  0, 
  0, 
  0, 
  45000, 
  45000, 
  'Historical data migration', 
  'Paid', 
  '2026-06-22T05:22:09.616Z', 
  '2026-06-22T05:22:09.616Z'
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-012'), 
  'BGPPL GST AMC (Milestone 3)', 
  1, 
  45000, 
  45000, 
  0
);
INSERT INTO payments (invoice_id, amount, payment_date, method, reference, notes, created_at)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-012'), 
  45000, 
  '2025-08-06', 
  'bank_transfer', 
  'TXN-INV-012', 
  'Imported payment history', 
  '2026-06-22T05:22:09.616Z'
);

-- Invoice INV-013
INSERT INTO invoices (invoice_number, client_id, po_id, issue_date, due_date, status, currency, subtotal, tax_label, tax_rate, tax_amount, discount_amount, total, amount_paid, notes, terms, created_at, updated_at)
VALUES (
  'INV-013', 
  (SELECT id FROM clients WHERE name LIKE '%MastersIndia%' LIMIT 1), 
  NULL, 
  '2025-12-31', 
  '2026-01-15', 
  'paid', 
  'INR', 
  25000, 
  'GST', 
  0, 
  0, 
  0, 
  25000, 
  25000, 
  'Historical data migration', 
  'Paid', 
  '2026-06-22T05:22:09.616Z', 
  '2026-06-22T05:22:09.616Z'
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-013'), 
  'Motherson Change Request (Part 1)', 
  1, 
  20000, 
  20000, 
  0
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-013'), 
  'BGPPL Adhoc Work (Part 2)', 
  1, 
  5000, 
  5000, 
  1
);
INSERT INTO payments (invoice_id, amount, payment_date, method, reference, notes, created_at)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-013'), 
  25000, 
  '2026-01-05', 
  'bank_transfer', 
  'TXN-INV-013', 
  'Imported payment history', 
  '2026-06-22T05:22:09.616Z'
);

-- Invoice INV-014
INSERT INTO invoices (invoice_number, client_id, po_id, issue_date, due_date, status, currency, subtotal, tax_label, tax_rate, tax_amount, discount_amount, total, amount_paid, notes, terms, created_at, updated_at)
VALUES (
  'INV-014', 
  (SELECT id FROM clients WHERE name LIKE '%MastersIndia%' LIMIT 1), 
  108, 
  '2026-02-01', 
  '2026-02-16', 
  'paid', 
  'INR', 
  20000, 
  'GST', 
  0, 
  0, 
  0, 
  20000, 
  20000, 
  'Historical data migration', 
  'Paid', 
  '2026-06-22T05:22:09.616Z', 
  '2026-06-22T05:22:09.616Z'
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-014'), 
  'Motherson PROD Deployment', 
  1, 
  20000, 
  20000, 
  0
);
INSERT INTO payments (invoice_id, amount, payment_date, method, reference, notes, created_at)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-014'), 
  20000, 
  '2026-02-06', 
  'bank_transfer', 
  'TXN-INV-014', 
  'Imported payment history', 
  '2026-06-22T05:22:09.616Z'
);

-- Invoice INV-202627-0001
INSERT INTO invoices (invoice_number, client_id, po_id, issue_date, due_date, status, currency, subtotal, tax_label, tax_rate, tax_amount, discount_amount, total, amount_paid, notes, terms, created_at, updated_at)
VALUES (
  'INV-202627-0001', 
  (SELECT id FROM clients WHERE name LIKE '%MastersIndia%' LIMIT 1), 
  107, 
  '2026-04-01', 
  '2026-04-16', 
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
  '2026-06-22T05:22:09.616Z', 
  '2026-06-22T05:22:09.616Z'
);
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-202627-0001'), 
  'Motherson Work (PO/25-26/007)', 
  1, 
  40000, 
  40000, 
  0
);
INSERT INTO payments (invoice_id, amount, payment_date, method, reference, notes, created_at)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-202627-0001'), 
  40000, 
  '2026-04-06', 
  'bank_transfer', 
  'TXN-INV-202627-0001', 
  'Imported payment history', 
  '2026-06-22T05:22:09.616Z'
);
