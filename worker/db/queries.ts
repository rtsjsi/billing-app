import { D1Database } from '@cloudflare/workers-types';
import { formatInvoiceNumber, getPeriodPattern } from '../lib/invoice-number';

// ----------------------------------------------------
// Type Definitions
// ----------------------------------------------------

export interface User {
  id: number;
  username: string;
  password_hash: string;
  password_salt: string;
  created_at: string;
}

export interface BusinessSettings {
  id: 1;
  business_name: string;
  owner_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  gstin: string | null;
  pan: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_name: string | null;
  upi_id: string | null;
  currency: string;
  tax_label: string;
  default_tax_rate: number;
  invoice_prefix: string;
  invoice_next_number: number;
  invoice_number_reset: 'never' | 'calendar_year' | 'financial_year';
  default_payment_terms_days: number;
  default_notes: string | null;
  default_terms: string | null;
  updated_at: string;
}

export interface Client {
  id: number;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  billing_address: string | null;
  gstin: string | null;
  notes: string | null;
  is_archived: number;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: number;
  client_id: number;
  client_name?: string;
  po_number: string;
  po_date: string | null;
  description: string | null;
  amount: number | null;
  currency: string;
  status: 'open' | 'partially_invoiced' | 'fulfilled' | 'cancelled';
  attachment_key: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  client_id: number;
  client_name?: string;
  client_company?: string;
  po_id: number | null;
  po_number?: string;
  issue_date: string;
  due_date: string | null;
  status: 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  derived_status?: 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  currency: string;
  subtotal: number;
  tax_label: string | null;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  amount_paid: number;
  notes: string | null;
  terms: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  sort_order: number;
}

export interface Payment {
  id: number;
  invoice_id: number;
  invoice_number?: string;
  amount: number;
  payment_date: string;
  method: 'bank_transfer' | 'upi' | 'cash' | 'cheque' | 'other' | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

// ----------------------------------------------------
// User Queries
// ----------------------------------------------------

export async function getUserCount(db: D1Database): Promise<number> {
  const result = await db.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>();
  return result?.count ?? 0;
}

export async function getUserByUsername(db: D1Database, username: string): Promise<User | null> {
  return await db.prepare('SELECT * FROM users WHERE username = ?').bind(username).first<User>();
}

export async function createUser(
  db: D1Database,
  username: string,
  passwordHash: string,
  passwordSalt: string
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare('INSERT INTO users (username, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?)')
    .bind(username, passwordHash, passwordSalt, now)
    .run();
}

export async function updateUserPassword(
  db: D1Database,
  userId: number,
  passwordHash: string,
  passwordSalt: string
): Promise<void> {
  await db
    .prepare('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?')
    .bind(passwordHash, passwordSalt, userId)
    .run();
}

// ----------------------------------------------------
// Settings Queries
// ----------------------------------------------------

export async function getSettings(db: D1Database): Promise<BusinessSettings> {
  const settings = await db.prepare('SELECT * FROM business_settings WHERE id = 1').first<BusinessSettings>();
  if (!settings) {
    throw new Error('Business settings not found');
  }
  return settings;
}

export async function updateSettings(
  db: D1Database,
  settings: Partial<Omit<BusinessSettings, 'id' | 'updated_at'>>
): Promise<void> {
  const now = new Date().toISOString();
  const keys = Object.keys(settings);
  if (keys.length === 0) return;

  const sets = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => (settings as any)[k]);
  
  const query = `UPDATE business_settings SET ${sets}, updated_at = ? WHERE id = 1`;
  await db.prepare(query).bind(...values, now).run();
}

// ----------------------------------------------------
// Client Queries
// ----------------------------------------------------

export async function listClients(
  db: D1Database,
  includeArchived: boolean = false,
  search: string = ''
): Promise<Client[]> {
  let query = 'SELECT * FROM clients WHERE 1=1';
  const binds: any[] = [];

  if (!includeArchived) {
    query += ' AND is_archived = 0';
  }
  if (search) {
    query += ' AND (name LIKE ? OR company_name LIKE ? OR email LIKE ?)';
    const term = `%${search}%`;
    binds.push(term, term, term);
  }
  query += ' ORDER BY name ASC';

  const { results } = await db.prepare(query).bind(...binds).all<Client>();
  return results || [];
}

export async function getClientById(db: D1Database, id: number): Promise<Client | null> {
  return await db.prepare('SELECT * FROM clients WHERE id = ?').bind(id).first<Client>();
}

export async function createClient(db: D1Database, client: Omit<Client, 'id' | 'is_archived' | 'created_at' | 'updated_at'>): Promise<number> {
  const now = new Date().toISOString();
  const result = await db
    .prepare(
      `INSERT INTO clients (name, company_name, email, phone, billing_address, gstin, notes, is_archived, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
    )
    .bind(
      client.name,
      client.company_name || null,
      client.email || null,
      client.phone || null,
      client.billing_address || null,
      client.gstin || null,
      client.notes || null,
      now,
      now
    )
    .run();
  
  return result.meta.last_row_id ?? 0;
}

export async function updateClient(db: D1Database, id: number, client: Partial<Omit<Client, 'id' | 'created_at' | 'updated_at'>>): Promise<void> {
  const now = new Date().toISOString();
  const keys = Object.keys(client);
  if (keys.length === 0) return;

  const sets = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => (client as any)[k]);

  const query = `UPDATE clients SET ${sets}, updated_at = ? WHERE id = ?`;
  await db.prepare(query).bind(...values, now, id).run();
}

export async function getClientReferences(db: D1Database, id: number): Promise<{ invoices: number; pos: number }> {
  const invoices = await db.prepare('SELECT COUNT(*) as count FROM invoices WHERE client_id = ?').bind(id).first<{ count: number }>();
  const pos = await db.prepare('SELECT COUNT(*) as count FROM purchase_orders WHERE client_id = ?').bind(id).first<{ count: number }>();
  return {
    invoices: invoices?.count ?? 0,
    pos: pos?.count ?? 0
  };
}

export async function deleteClient(db: D1Database, id: number): Promise<void> {
  await db.prepare('DELETE FROM clients WHERE id = ?').bind(id).run();
}

// ----------------------------------------------------
// Purchase Order Queries
// ----------------------------------------------------

export async function listPOs(db: D1Database, clientId?: number, status?: string): Promise<PurchaseOrder[]> {
  let query = `
    SELECT po.*, c.name as client_name
    FROM purchase_orders po
    JOIN clients c ON po.client_id = c.id
    WHERE 1=1
  `;
  const binds: any[] = [];

  if (clientId) {
    query += ' AND po.client_id = ?';
    binds.push(clientId);
  }
  if (status) {
    query += ' AND po.status = ?';
    binds.push(status);
  }
  query += ' ORDER BY po.po_date DESC, po.id DESC';

  const { results } = await db.prepare(query).bind(...binds).all<PurchaseOrder>();
  return results || [];
}

export async function getPOById(db: D1Database, id: number): Promise<PurchaseOrder | null> {
  return await db.prepare(`
    SELECT po.*, c.name as client_name
    FROM purchase_orders po
    JOIN clients c ON po.client_id = c.id
    WHERE po.id = ?
  `).bind(id).first<PurchaseOrder>();
}

export async function createPO(db: D1Database, po: Omit<PurchaseOrder, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  const now = new Date().toISOString();
  const result = await db.prepare(`
    INSERT INTO purchase_orders (client_id, po_number, po_date, description, amount, currency, status, attachment_key, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    po.client_id,
    po.po_number,
    po.po_date || null,
    po.description || null,
    po.amount || 0,
    po.currency,
    po.status || 'open',
    po.attachment_key || null,
    po.notes || null,
    now,
    now
  ).run();

  return result.meta.last_row_id ?? 0;
}

export async function updatePO(db: D1Database, id: number, po: Partial<Omit<PurchaseOrder, 'id' | 'created_at' | 'updated_at'>>): Promise<void> {
  const now = new Date().toISOString();
  const keys = Object.keys(po);
  if (keys.length === 0) return;

  const sets = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => (po as any)[k]);

  const query = `UPDATE purchase_orders SET ${sets}, updated_at = ? WHERE id = ?`;
  await db.prepare(query).bind(...values, now, id).run();
}

export async function deletePO(db: D1Database, id: number): Promise<void> {
  await db.prepare('DELETE FROM purchase_orders WHERE id = ?').bind(id).run();
}

export async function getPOInvoicedAmount(db: D1Database, poId: number): Promise<number> {
  const result = await db.prepare(`
    SELECT SUM(total) as invoiced 
    FROM invoices 
    WHERE po_id = ? AND status != 'cancelled'
  `).bind(poId).first<{ invoiced: number | null }>();
  return result?.invoiced ?? 0;
}

// ----------------------------------------------------
// Invoice Queries
// ----------------------------------------------------

const INVOICE_SELECT_FIELDS = `
  i.*, 
  c.name as client_name, 
  c.company_name as client_company,
  po.po_number as po_number,
  CASE 
    WHEN i.status NOT IN ('paid', 'cancelled') AND i.due_date < DATE('now') AND i.amount_paid < i.total THEN 'overdue' 
    ELSE i.status 
  END as status
`;

export async function listInvoices(
  db: D1Database,
  status?: string,
  clientId?: number,
  startDate?: string,
  endDate?: string,
  limit: number = 20,
  offset: number = 0
): Promise<Invoice[]> {
  let query = `
    SELECT ${INVOICE_SELECT_FIELDS}
    FROM invoices i
    JOIN clients c ON i.client_id = c.id
    LEFT JOIN purchase_orders po ON i.po_id = po.id
    WHERE 1=1
  `;
  const binds: any[] = [];

  if (clientId) {
    query += ' AND i.client_id = ?';
    binds.push(clientId);
  }
  if (startDate) {
    query += ' AND i.issue_date >= ?';
    binds.push(startDate);
  }
  if (endDate) {
    query += ' AND i.issue_date <= ?';
    binds.push(endDate);
  }

  // Handle status filter considering derived 'overdue' state
  if (status) {
    if (status === 'overdue') {
      query += ` AND i.status NOT IN ('paid', 'cancelled') AND i.due_date < DATE('now') AND i.amount_paid < i.total`;
    } else {
      query += ` AND i.status = ? AND NOT (i.status NOT IN ('paid', 'cancelled') AND i.due_date < DATE('now') AND i.amount_paid < i.total)`;
      binds.push(status);
    }
  }

  query += ' ORDER BY i.issue_date DESC, i.invoice_number DESC LIMIT ? OFFSET ?';
  binds.push(limit, offset);

  const { results } = await db.prepare(query).bind(...binds).all<Invoice>();
  return results || [];
}

export async function countInvoices(
  db: D1Database,
  status?: string,
  clientId?: number,
  startDate?: string,
  endDate?: string
): Promise<number> {
  let query = `
    SELECT COUNT(*) as count
    FROM invoices i
    WHERE 1=1
  `;
  const binds: any[] = [];

  if (clientId) {
    query += ' AND i.client_id = ?';
    binds.push(clientId);
  }
  if (startDate) {
    query += ' AND i.issue_date >= ?';
    binds.push(startDate);
  }
  if (endDate) {
    query += ' AND i.issue_date <= ?';
    binds.push(endDate);
  }

  if (status) {
    if (status === 'overdue') {
      query += ` AND i.status NOT IN ('paid', 'cancelled') AND i.due_date < DATE('now') AND i.amount_paid < i.total`;
    } else {
      query += ` AND i.status = ? AND NOT (i.status NOT IN ('paid', 'cancelled') AND i.due_date < DATE('now') AND i.amount_paid < i.total)`;
      binds.push(status);
    }
  }

  const result = await db.prepare(query).bind(...binds).first<{ count: number }>();
  return result?.count ?? 0;
}

export async function getInvoiceById(db: D1Database, id: number): Promise<Invoice | null> {
  return await db.prepare(`
    SELECT ${INVOICE_SELECT_FIELDS}
    FROM invoices i
    JOIN clients c ON i.client_id = c.id
    LEFT JOIN purchase_orders po ON i.po_id = po.id
    WHERE i.id = ?
  `).bind(id).first<Invoice>();
}

export async function getInvoiceItems(db: D1Database, invoiceId: number): Promise<InvoiceItem[]> {
  const { results } = await db
    .prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order ASC, id ASC')
    .bind(invoiceId)
    .all<InvoiceItem>();
  return results || [];
}

// Generates next invoice number atomically inside a transaction (handled in Hono using batch)
export async function getNextInvoiceNumber(db: D1Database, settings: BusinessSettings): Promise<{ invoiceNumber: string; nextNumValue: number }> {
  const now = new Date();
  
  // Calculate if the year/FY has changed and we need to reset the invoice counter
  const pattern = getPeriodPattern(settings.invoice_prefix, settings.invoice_number_reset, now);
  
  const countRes = await db
    .prepare('SELECT COUNT(*) as count FROM invoices WHERE invoice_number LIKE ?')
    .bind(pattern)
    .first<{ count: number }>();
  
  const periodInvoicesExist = (countRes?.count ?? 0) > 0;
  
  let nextNumber = settings.invoice_next_number;
  if (settings.invoice_number_reset !== 'never' && !periodInvoicesExist) {
    // Reset to 1 since there are no invoices in this period
    nextNumber = 1;
  }
  
  const invoiceNumber = formatInvoiceNumber(settings.invoice_prefix, nextNumber, settings.invoice_number_reset, now);
  return { invoiceNumber, nextNumValue: nextNumber };
}

export async function createInvoice(
  db: D1Database,
  invoice: Omit<Invoice, 'id' | 'invoice_number' | 'amount_paid' | 'created_at' | 'updated_at'>,
  items: Omit<InvoiceItem, 'id' | 'invoice_id'>[]
): Promise<number> {
  const now = new Date().toISOString();
  const settings = await getSettings(db);
  const { invoiceNumber, nextNumValue } = await getNextInvoiceNumber(db, settings);

  // We write statements to run in a D1 transaction batch
  const stmts = [];

  // 1. Insert invoice
  const insertInvoiceStmt = db.prepare(`
    INSERT INTO invoices (
      invoice_number, client_id, po_id, issue_date, due_date, status, currency, 
      subtotal, tax_label, tax_rate, tax_amount, discount_amount, total, amount_paid, notes, terms, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
  `).bind(
    invoiceNumber,
    invoice.client_id,
    invoice.po_id || null,
    invoice.issue_date,
    invoice.due_date || null,
    invoice.status || 'draft',
    invoice.currency,
    invoice.subtotal,
    invoice.tax_label || null,
    invoice.tax_rate,
    invoice.tax_amount,
    invoice.discount_amount,
    invoice.total,
    invoice.notes || null,
    invoice.terms || null,
    now,
    now
  );
  stmts.push(insertInvoiceStmt);

  // 2. Update next invoice number in settings
  const nextVal = nextNumValue + 1;
  const updateSettingsStmt = db
    .prepare('UPDATE business_settings SET invoice_next_number = ?, updated_at = ? WHERE id = 1')
    .bind(nextVal, now);
  stmts.push(updateSettingsStmt);

  // Run the batch for the invoice row and the settings increment
  // D1 executes batch queries in a single SQLite transaction
  const batchRes = await db.batch(stmts);
  
  // The first execution result gives the generated row ID of the invoice
  const invoiceId = batchRes[0].meta.last_row_id;
  if (!invoiceId) throw new Error('Failed to retrieve inserted invoice ID');

  // 3. Insert items
  const itemStmts = items.map((item, index) => {
    return db.prepare(`
      INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      invoiceId,
      item.description,
      item.quantity,
      item.unit_price,
      item.amount,
      item.sort_order ?? index
    );
  });

  if (itemStmts.length > 0) {
    await db.batch(itemStmts);
  }

  // Update PO status if the invoice references a PO
  if (invoice.po_id) {
    await updatePOStatusFromInvoices(db, invoice.po_id);
  }

  return invoiceId;
}

export async function updateInvoice(
  db: D1Database,
  id: number,
  invoice: Partial<Omit<Invoice, 'id' | 'invoice_number' | 'amount_paid' | 'created_at' | 'updated_at'>>,
  items?: Omit<InvoiceItem, 'id' | 'invoice_id'>[]
): Promise<void> {
  const now = new Date().toISOString();
  const oldInvoice = await getInvoiceById(db, id);
  if (!oldInvoice) throw new Error('Invoice not found');

  const stmts = [];

  // Update invoice fields
  const keys = Object.keys(invoice);
  if (keys.length > 0) {
    const sets = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => (invoice as any)[k]);
    const updateStmt = db
      .prepare(`UPDATE invoices SET ${sets}, updated_at = ? WHERE id = ?`)
      .bind(...values, now, id);
    stmts.push(updateStmt);
  }

  // If items are provided, delete old ones and insert new ones
  if (items) {
    const deleteItemsStmt = db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').bind(id);
    stmts.push(deleteItemsStmt);

    items.forEach((item, index) => {
      const insertItemStmt = db.prepare(`
        INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        item.description,
        item.quantity,
        item.unit_price,
        item.amount,
        item.sort_order ?? index
      );
      stmts.push(insertItemStmt);
    });
  }

  if (stmts.length > 0) {
    await db.batch(stmts);
  }

  // Handle PO updates
  if (oldInvoice.po_id) {
    await updatePOStatusFromInvoices(db, oldInvoice.po_id);
  }
  if (invoice.po_id && invoice.po_id !== oldInvoice.po_id) {
    await updatePOStatusFromInvoices(db, invoice.po_id);
  }
}

export async function deleteInvoice(db: D1Database, id: number): Promise<void> {
  const invoice = await getInvoiceById(db, id);
  await db.prepare('DELETE FROM invoices WHERE id = ?').bind(id).run();
  
  if (invoice?.po_id) {
    await updatePOStatusFromInvoices(db, invoice.po_id);
  }
}

export async function updateInvoiceStatus(db: D1Database, id: number, status: string): Promise<void> {
  const now = new Date().toISOString();
  await db.prepare('UPDATE invoices SET status = ?, updated_at = ? WHERE id = ?').bind(status, now, id).run();
}

// ----------------------------------------------------
// Payment Queries
// ----------------------------------------------------

export async function listPaymentsByInvoiceId(db: D1Database, invoiceId: number): Promise<Payment[]> {
  const { results } = await db
    .prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC, id DESC')
    .bind(invoiceId)
    .all<Payment>();
  return results || [];
}

export async function addPayment(
  db: D1Database,
  invoiceId: number,
  amount: number,
  paymentDate: string,
  method: string | null,
  reference: string | null,
  notes: string | null
): Promise<number> {
  const now = new Date().toISOString();
  
  // Insert payment and update invoice amount_paid & status in a transaction batch
  const insertPaymentStmt = db.prepare(`
    INSERT INTO payments (invoice_id, amount, payment_date, method, reference, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(invoiceId, amount, paymentDate, method, reference, notes, now);

  const batchResult = await db.batch([insertPaymentStmt]);
  const paymentId = batchResult[0].meta.last_row_id;
  if (!paymentId) throw new Error('Failed to record payment');

  // Recalculate invoice totals and status
  await recalculateInvoicePayment(db, invoiceId);

  return paymentId;
}

export async function deletePayment(db: D1Database, id: number): Promise<void> {
  const payment = await db.prepare('SELECT invoice_id FROM payments WHERE id = ?').bind(id).first<Payment>();
  if (!payment) return;

  await db.prepare('DELETE FROM payments WHERE id = ?').bind(id).run();
  await recalculateInvoicePayment(db, payment.invoice_id);
}

async function recalculateInvoicePayment(db: D1Database, invoiceId: number): Promise<void> {
  const totalPaymentsRes = await db
    .prepare('SELECT SUM(amount) as sum_amount FROM payments WHERE invoice_id = ?')
    .bind(invoiceId)
    .first<{ sum_amount: number | null }>();
  
  const sumAmount = totalPaymentsRes?.sum_amount ?? 0;
  
  const invoice = await getInvoiceById(db, invoiceId);
  if (!invoice) return;

  let newStatus = invoice.status;
  if (invoice.status !== 'draft' && invoice.status !== 'cancelled') {
    if (sumAmount >= invoice.total) {
      newStatus = 'paid';
    } else if (sumAmount > 0) {
      newStatus = 'partially_paid';
    } else {
      newStatus = 'sent';
    }
  }

  const now = new Date().toISOString();
  await db
    .prepare('UPDATE invoices SET amount_paid = ?, status = ?, updated_at = ? WHERE id = ?')
    .bind(sumAmount, newStatus, now, invoiceId)
    .run();
}

// ----------------------------------------------------
// Business Logic Helpers
// ----------------------------------------------------

// Automatically derive PO status (open | partially_invoiced | fulfilled | cancelled)
export async function updatePOStatusFromInvoices(db: D1Database, poId: number): Promise<void> {
  const po = await getPOById(db, poId);
  if (!po || po.status === 'cancelled') return;

  const invoicedAmount = await getPOInvoicedAmount(db, poId);
  const poAmount = po.amount || 0;

  let newStatus: PurchaseOrder['status'] = 'open';
  if (invoicedAmount >= poAmount && poAmount > 0) {
    newStatus = 'fulfilled';
  } else if (invoicedAmount > 0) {
    newStatus = 'partially_invoiced';
  }

  const now = new Date().toISOString();
  await db
    .prepare('UPDATE purchase_orders SET status = ?, updated_at = ? WHERE id = ?')
    .bind(newStatus, now, poId)
    .run();
}

// ----------------------------------------------------
// Dashboard Queries
// ----------------------------------------------------

export interface DashboardStats {
  totalInvoiceAmount: number;
  totalPaidAmount: number;
  totalOutstanding: number;
  overdueCount: number;
}

export async function getDashboardStats(
  db: D1Database
): Promise<DashboardStats> {
  // 1. Total Outstanding (invoices status != 'cancelled' AND status != 'draft' - outstanding means sent and not paid)
  // Sum of total - amount_paid
  const outstandingRes = await db
    .prepare("SELECT SUM(total - amount_paid) as outstanding FROM invoices WHERE status NOT IN ('draft', 'cancelled')")
    .first<{ outstanding: number | null }>();
  
  // 2. Total Invoice Amount (sum of all invoices except cancelled)
  const totalInvoiceRes = await db
    .prepare("SELECT SUM(total) as total_amount FROM invoices WHERE status != 'cancelled'")
    .first<{ total_amount: number | null }>();

  // 3. Total Paid Amount (sum of amount_paid of all invoices except cancelled)
  const totalPaidRes = await db
    .prepare("SELECT SUM(amount_paid) as total_paid FROM invoices WHERE status != 'cancelled'")
    .first<{ total_paid: number | null }>();

  // 4. Overdue count (status not paid or cancelled, due date passed, amount paid < total)
  const overdueCountRes = await db
    .prepare(`
      SELECT COUNT(*) as count 
      FROM invoices 
      WHERE status NOT IN ('paid', 'cancelled') 
        AND due_date < DATE('now') 
        AND amount_paid < total
    `)
    .first<{ count: number | null }>();

  return {
    totalInvoiceAmount: totalInvoiceRes?.total_amount ?? 0,
    totalPaidAmount: totalPaidRes?.total_paid ?? 0,
    totalOutstanding: outstandingRes?.outstanding ?? 0,
    overdueCount: overdueCountRes?.count ?? 0
  };
}

export async function getRecentActivity(db: D1Database): Promise<{ recentInvoices: Invoice[]; openPOs: PurchaseOrder[] }> {
  // Recent 5 invoices
  const { results: recentInvoices } = await db
    .prepare(`
      SELECT ${INVOICE_SELECT_FIELDS}
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      LEFT JOIN purchase_orders po ON i.po_id = po.id
      ORDER BY i.issue_date DESC, i.id DESC
      LIMIT 5
    `)
    .all<Invoice>();

  // Open Purchase Orders not yet fully invoiced (status is 'open' or 'partially_invoiced')
  const { results: openPOs } = await db
    .prepare(`
      SELECT po.*, c.name as client_name
      FROM purchase_orders po
      JOIN clients c ON po.client_id = c.id
      WHERE po.status IN ('open', 'partially_invoiced')
      ORDER BY po.po_date DESC, po.id DESC
      LIMIT 5
    `)
    .all<PurchaseOrder>();

  return {
    recentInvoices: recentInvoices || [],
    openPOs: openPOs || []
  };
}

// ----------------------------------------------------
// Export Data Queries
// ----------------------------------------------------

export async function exportClients(db: D1Database): Promise<any[]> {
  const { results } = await db.prepare('SELECT * FROM clients ORDER BY id ASC').all();
  return results || [];
}

export async function exportInvoices(db: D1Database): Promise<any[]> {
  const { results } = await db.prepare('SELECT * FROM invoices ORDER BY id ASC').all();
  return results || [];
}

export async function exportPOs(db: D1Database): Promise<any[]> {
  const { results } = await db.prepare('SELECT * FROM purchase_orders ORDER BY id ASC').all();
  return results || [];
}
