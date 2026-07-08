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
  id: number;
  user_id: number;
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
  user_id: number;
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
  user_id: number;
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
  invoiced_amount?: number;
}

export interface Invoice {
  id: number;
  user_id: number;
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
): Promise<number> {
  const now = new Date().toISOString();
  const res = await db
    .prepare('INSERT INTO users (username, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?) RETURNING id')
    .bind(username, passwordHash, passwordSalt, now)
    .first<{ id: number }>();
  
  if (!res) throw new Error('Failed to create user');
  return res.id;
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

export async function getSettings(db: D1Database, userId: number): Promise<BusinessSettings> {
  // Some deployments may have partially-populated rows in `business_settings`
  // (e.g. older schema versions or manual DB edits). Normalize missing/empty
  // values in code so the frontend can reliably render and proceed.
  const raw = await db
    .prepare('SELECT * FROM business_settings WHERE user_id = ?')
    .bind(userId)
    .first<any>();

  if (!raw) throw new Error('Business settings not found');

  const normalized: BusinessSettings = {
    ...raw,
    business_name: (raw.business_name && String(raw.business_name).trim()) ? String(raw.business_name) : 'Business',
    currency: (raw.currency && String(raw.currency).trim()) ? String(raw.currency) : 'INR',
    tax_label: (raw.tax_label && String(raw.tax_label).trim()) ? String(raw.tax_label) : 'GST',
    default_tax_rate: raw.default_tax_rate ?? 0,
    invoice_prefix: (raw.invoice_prefix && String(raw.invoice_prefix).trim()) ? String(raw.invoice_prefix) : 'INV-',
    invoice_next_number: raw.invoice_next_number ?? 1,
    invoice_number_reset: raw.invoice_number_reset ?? 'financial_year',
    default_payment_terms_days: raw.default_payment_terms_days ?? 15,
    // These are intentionally nullable in the DB schema.
    default_notes: raw.default_notes ?? null,
    default_terms: raw.default_terms ?? null,
    updated_at: raw.updated_at ?? new Date().toISOString(),
  };

  return normalized;
}

export async function updateSettings(
  db: D1Database,
  userId: number,
  settings: Partial<Omit<BusinessSettings, 'id' | 'user_id' | 'updated_at'>>
): Promise<void> {
  const now = new Date().toISOString();
  const keys = Object.keys(settings);
  if (keys.length === 0) return;

  const sets = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => (settings as any)[k]);
  
  const query = `UPDATE business_settings SET ${sets}, updated_at = ? WHERE user_id = ?`;
  await db.prepare(query).bind(...values, now, userId).run();
}

// ----------------------------------------------------
// Client Queries
// ----------------------------------------------------

export async function listClients(
  db: D1Database,
  userId: number,
  includeArchived: boolean = false,
  search: string = ''
): Promise<Client[]> {
  let query = 'SELECT * FROM clients WHERE user_id = ?';
  const binds: any[] = [userId];

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

export async function getClientById(db: D1Database, userId: number, id: number): Promise<Client | null> {
  return await db.prepare('SELECT * FROM clients WHERE user_id = ? AND id = ?').bind(userId, id).first<Client>();
}

export async function createClient(db: D1Database, userId: number, client: Omit<Client, 'id' | 'user_id' | 'is_archived' | 'created_at' | 'updated_at'>): Promise<number> {
  const now = new Date().toISOString();
  const result = await db
    .prepare(
      `INSERT INTO clients (user_id, name, company_name, email, phone, billing_address, gstin, notes, is_archived, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
    )
    .bind(
      userId,
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

export async function updateClient(db: D1Database, userId: number, id: number, client: Partial<Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<void> {
  const now = new Date().toISOString();
  const keys = Object.keys(client);
  if (keys.length === 0) return;

  const sets = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => (client as any)[k]);

  const query = `UPDATE clients SET ${sets}, updated_at = ? WHERE user_id = ? AND id = ?`;
  await db.prepare(query).bind(...values, now, userId, id).run();
}

export async function getClientReferences(db: D1Database, userId: number, id: number): Promise<{ invoices: number; pos: number }> {
  const invoices = await db.prepare('SELECT COUNT(*) as count FROM invoices WHERE user_id = ? AND client_id = ?').bind(userId, id).first<{ count: number }>();
  const pos = await db.prepare('SELECT COUNT(*) as count FROM purchase_orders WHERE user_id = ? AND client_id = ?').bind(userId, id).first<{ count: number }>();
  return {
    invoices: invoices?.count ?? 0,
    pos: pos?.count ?? 0
  };
}

export async function deleteClient(db: D1Database, userId: number, id: number): Promise<void> {
  await db.prepare('DELETE FROM clients WHERE user_id = ? AND id = ?').bind(userId, id).run();
}

// ----------------------------------------------------
// Purchase Order Queries
// ----------------------------------------------------

export async function listPOs(db: D1Database, userId: number, clientId?: number, status?: string): Promise<PurchaseOrder[]> {
  let query = `
    SELECT po.*, c.name as client_name,
           (SELECT COALESCE(SUM(total), 0) FROM invoices WHERE po_id = po.id AND status != 'cancelled') as invoiced_amount
    FROM purchase_orders po
    JOIN clients c ON po.client_id = c.id
    WHERE po.user_id = ?
  `;
  const binds: any[] = [userId];

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

export async function getPOById(db: D1Database, userId: number, id: number): Promise<PurchaseOrder | null> {
  return await db.prepare(`
    SELECT po.*, c.name as client_name,
           (SELECT COALESCE(SUM(total), 0) FROM invoices WHERE po_id = po.id AND status != 'cancelled') as invoiced_amount
    FROM purchase_orders po
    JOIN clients c ON po.client_id = c.id
    WHERE po.user_id = ? AND po.id = ?
  `).bind(userId, id).first<PurchaseOrder>();
}

export async function getPOItems(db: D1Database, userId: number, poId: number): Promise<any[]> {
  const { results } = await db
    .prepare('SELECT poi.* FROM purchase_order_items poi JOIN purchase_orders po ON poi.po_id = po.id WHERE po.user_id = ? AND po.id = ? ORDER BY poi.sort_order ASC, poi.id ASC')
    .bind(userId, poId)
    .all();
  return results || [];
}

export async function createPO(db: D1Database, userId: number, po: Omit<PurchaseOrder, 'id' | 'user_id' | 'created_at' | 'updated_at'>, items?: any[]): Promise<number> {
  const now = new Date().toISOString();
  const stmts = [];
  
  const insertPOStmt = db.prepare(`
    INSERT INTO purchase_orders (user_id, client_id, po_number, po_date, description, amount, currency, status, attachment_key, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    userId,
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
  );
  stmts.push(insertPOStmt);
  
  const batchRes = await db.batch(stmts);
  const poId = batchRes[0].meta.last_row_id;
  if (!poId) throw new Error('Failed to retrieve inserted PO ID');

  if (items && items.length > 0) {
    const itemStmts = items.map((item, index) => {
      return db.prepare(`
        INSERT INTO purchase_order_items (po_id, description, quantity, unit_price, amount, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        poId,
        item.description,
        item.quantity,
        item.unit_price,
        item.amount,
        item.sort_order ?? index
      );
    });
    await db.batch(itemStmts);
  }

  return poId;
}

export async function updatePO(db: D1Database, userId: number, id: number, po: Partial<Omit<PurchaseOrder, 'id' | 'user_id' | 'created_at' | 'updated_at'>>, items?: any[]): Promise<void> {
  const now = new Date().toISOString();
  const keys = Object.keys(po).filter(k => k !== 'items');
  const stmts = [];

  if (keys.length > 0) {
    const sets = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => (po as any)[k]);
    const updateStmt = db.prepare(`UPDATE purchase_orders SET ${sets}, updated_at = ? WHERE user_id = ? AND id = ?`).bind(...values, now, userId, id);
    stmts.push(updateStmt);
  }

  if (items) {
    stmts.push(db.prepare('DELETE FROM purchase_order_items WHERE po_id = ?').bind(id));
    items.forEach((item, index) => {
      stmts.push(db.prepare(`
        INSERT INTO purchase_order_items (po_id, description, quantity, unit_price, amount, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        item.description,
        item.quantity,
        item.unit_price,
        item.amount,
        item.sort_order ?? index
      ));
    });
  }

  if (stmts.length > 0) {
    await db.batch(stmts);
  }
}

export async function deletePO(db: D1Database, userId: number, id: number): Promise<void> {
  await db.prepare('DELETE FROM purchase_orders WHERE user_id = ? AND id = ?').bind(userId, id).run();
}

export async function getPOInvoicedAmount(db: D1Database, userId: number, poId: number): Promise<number> {
  const result = await db.prepare(`
    SELECT SUM(total) as invoiced 
    FROM invoices 
    WHERE user_id = ? AND po_id = ? AND status != 'cancelled'
  `).bind(userId, poId).first<{ invoiced: number | null }>();
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
  userId: number,
  status?: string,
  clientId?: number,
  startDate?: string,
  endDate?: string,
  limit: number = 20,
  offset: number = 0,
  poId?: number
): Promise<Invoice[]> {
  let query = `
    SELECT ${INVOICE_SELECT_FIELDS}
    FROM invoices i
    JOIN clients c ON i.client_id = c.id
    LEFT JOIN purchase_orders po ON i.po_id = po.id
    WHERE i.user_id = ?
  `;
  const binds: any[] = [userId];

  if (clientId) {
    query += ' AND i.client_id = ?';
    binds.push(clientId);
  }
  if (poId) {
    query += ' AND i.po_id = ?';
    binds.push(poId);
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
  userId: number,
  status?: string,
  clientId?: number,
  startDate?: string,
  endDate?: string,
  poId?: number
): Promise<number> {
  let query = `
    SELECT COUNT(*) as count
    FROM invoices i
    WHERE i.user_id = ?
  `;
  const binds: any[] = [userId];

  if (clientId) {
    query += ' AND i.client_id = ?';
    binds.push(clientId);
  }
  if (poId) {
    query += ' AND i.po_id = ?';
    binds.push(poId);
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

export async function getInvoiceById(db: D1Database, userId: number, id: number): Promise<Invoice | null> {
  return await db.prepare(`
    SELECT ${INVOICE_SELECT_FIELDS}
    FROM invoices i
    JOIN clients c ON i.client_id = c.id
    LEFT JOIN purchase_orders po ON i.po_id = po.id
    WHERE i.user_id = ? AND i.id = ?
  `).bind(userId, id).first<Invoice>();
}

export async function getInvoiceItems(db: D1Database, userId: number, invoiceId: number): Promise<InvoiceItem[]> {
  const { results } = await db
    .prepare('SELECT ii.* FROM invoice_items ii JOIN invoices i ON ii.invoice_id = i.id WHERE i.user_id = ? AND i.id = ? ORDER BY ii.sort_order ASC, ii.id ASC')
    .bind(userId, invoiceId)
    .all<InvoiceItem>();
  return results || [];
}

export async function getNextInvoiceNumber(db: D1Database, userId: number, settings: BusinessSettings): Promise<{ invoiceNumber: string; nextNumValue: number }> {
  const now = new Date();
  
  // Calculate the prefix pattern for the current period (e.g., 'INV-2026-27-%')
  const pattern = getPeriodPattern(settings.invoice_prefix, settings.invoice_number_reset, now);
  const prefixWithoutPercent = pattern.replace('%', '');
  
  // Find the highest numeric suffix for the current pattern
  const maxQuery = `
    SELECT CAST(SUBSTR(invoice_number, ?) AS INTEGER) as max_num 
    FROM invoices 
    WHERE user_id = ? AND invoice_number LIKE ? 
    ORDER BY max_num DESC 
    LIMIT 1
  `;
  
  const res = await db.prepare(maxQuery).bind(prefixWithoutPercent.length + 1, userId, pattern).first<{ max_num: number | null }>();
  
  let nextNumber = 1;
  if (res && res.max_num !== null) {
    nextNumber = res.max_num + 1;
  }
  
  const invoiceNumber = formatInvoiceNumber(settings.invoice_prefix, nextNumber, settings.invoice_number_reset, now);
  return { invoiceNumber, nextNumValue: nextNumber };
}

export async function createInvoice(
  db: D1Database,
  userId: number,
  invoice: Omit<Invoice, 'id' | 'user_id' | 'invoice_number' | 'amount_paid' | 'created_at' | 'updated_at'>,
  items: Omit<InvoiceItem, 'id' | 'invoice_id'>[]
): Promise<number> {
  const now = new Date().toISOString();
  const settings = await getSettings(db, userId);
  const { invoiceNumber, nextNumValue } = await getNextInvoiceNumber(db, userId, settings);

  // We write statements to run in a D1 transaction batch
  const stmts = [];

  // 1. Insert invoice
  const insertInvoiceStmt = db.prepare(`
    INSERT INTO invoices (
      user_id, invoice_number, client_id, po_id, issue_date, due_date, status, currency, 
      subtotal, tax_label, tax_rate, tax_amount, discount_amount, total, amount_paid, notes, terms, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
  `).bind(
    userId,
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

  // Run the batch for the invoice row
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
    await updatePOStatusFromInvoices(db, userId, invoice.po_id);
  }

  return invoiceId;
}

export async function updateInvoice(
  db: D1Database,
  userId: number,
  id: number,
  invoice: Partial<Omit<Invoice, 'id' | 'user_id' | 'invoice_number' | 'amount_paid' | 'created_at' | 'updated_at'>>,
  items?: Omit<InvoiceItem, 'id' | 'invoice_id'>[]
): Promise<void> {
  const now = new Date().toISOString();
  const oldInvoice = await getInvoiceById(db, userId, id);
  if (!oldInvoice) throw new Error('Invoice not found');

  const stmts = [];

  // Update invoice fields
  const keys = Object.keys(invoice);
  if (keys.length > 0) {
    const sets = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => (invoice as any)[k]);
    const updateStmt = db
      .prepare(`UPDATE invoices SET ${sets}, updated_at = ? WHERE user_id = ? AND id = ?`)
      .bind(...values, now, userId, id);
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
    await updatePOStatusFromInvoices(db, userId, oldInvoice.po_id);
  }
  if (invoice.po_id && invoice.po_id !== oldInvoice.po_id) {
    await updatePOStatusFromInvoices(db, userId, invoice.po_id);
  }
}

export async function deleteInvoice(db: D1Database, userId: number, id: number): Promise<void> {
  const invoice = await getInvoiceById(db, userId, id);
  await db.prepare('DELETE FROM invoices WHERE user_id = ? AND id = ?').bind(userId, id).run();
  
  if (invoice?.po_id) {
    await updatePOStatusFromInvoices(db, userId, invoice.po_id);
  }
}

export async function updateInvoiceStatus(db: D1Database, userId: number, id: number, status: string): Promise<void> {
  const now = new Date().toISOString();
  await db.prepare('UPDATE invoices SET status = ?, updated_at = ? WHERE user_id = ? AND id = ?').bind(status, now, userId, id).run();
}

// ----------------------------------------------------
// Payment Queries
// ----------------------------------------------------

export async function listPaymentsByInvoiceId(db: D1Database, userId: number, invoiceId: number): Promise<Payment[]> {
  const { results } = await db
    .prepare('SELECT p.* FROM payments p JOIN invoices i ON p.invoice_id = i.id WHERE i.user_id = ? AND p.invoice_id = ? ORDER BY p.payment_date DESC, p.id DESC')
    .bind(userId, invoiceId)
    .all<Payment>();
  return results || [];
}

export async function addPayment(
  db: D1Database,
  userId: number,
  invoiceId: number,
  amount: number,
  paymentDate: string,
  method: string | null,
  reference: string | null,
  notes: string | null
): Promise<number> {
  const now = new Date().toISOString();
  
  // Verify invoice belongs to user
  const invoice = await getInvoiceById(db, userId, invoiceId);
  if (!invoice) throw new Error('Invoice not found');

  // Insert payment and update invoice amount_paid & status in a transaction batch
  const insertPaymentStmt = db.prepare(`
    INSERT INTO payments (invoice_id, amount, payment_date, method, reference, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(invoiceId, amount, paymentDate, method, reference, notes, now);

  const batchResult = await db.batch([insertPaymentStmt]);
  const paymentId = batchResult[0].meta.last_row_id;
  if (!paymentId) throw new Error('Failed to record payment');

  // Recalculate invoice totals and status
  await recalculateInvoicePayment(db, userId, invoiceId);

  return paymentId;
}

export async function deletePayment(db: D1Database, userId: number, id: number): Promise<void> {
  const payment = await db.prepare('SELECT p.invoice_id FROM payments p JOIN invoices i ON p.invoice_id = i.id WHERE i.user_id = ? AND p.id = ?').bind(userId, id).first<Payment>();
  if (!payment) return;

  await db.prepare('DELETE FROM payments WHERE id = ?').bind(id).run();
  await recalculateInvoicePayment(db, userId, payment.invoice_id);
}

async function recalculateInvoicePayment(db: D1Database, userId: number, invoiceId: number): Promise<void> {
  const totalPaymentsRes = await db
    .prepare('SELECT SUM(amount) as sum_amount FROM payments WHERE invoice_id = ?')
    .bind(invoiceId)
    .first<{ sum_amount: number | null }>();
  
  const sumAmount = totalPaymentsRes?.sum_amount ?? 0;
  
  const invoice = await getInvoiceById(db, userId, invoiceId);
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
    .prepare('UPDATE invoices SET amount_paid = ?, status = ?, updated_at = ? WHERE user_id = ? AND id = ?')
    .bind(sumAmount, newStatus, now, userId, invoiceId)
    .run();
}

// ----------------------------------------------------
// Business Logic Helpers
// ----------------------------------------------------

// Automatically derive PO status (open | partially_invoiced | fulfilled | cancelled)
export async function updatePOStatusFromInvoices(db: D1Database, userId: number, poId: number): Promise<void> {
  const po = await getPOById(db, userId, poId);
  if (!po || po.status === 'cancelled') return;

  const invoicedAmount = await getPOInvoicedAmount(db, userId, poId);
  const poAmount = po.amount || 0;

  let newStatus: PurchaseOrder['status'] = 'open';
  if (invoicedAmount >= poAmount && poAmount > 0) {
    newStatus = 'fulfilled';
  } else if (invoicedAmount > 0) {
    newStatus = 'partially_invoiced';
  }

  const now = new Date().toISOString();
  await db
    .prepare('UPDATE purchase_orders SET status = ?, updated_at = ? WHERE user_id = ? AND id = ?')
    .bind(newStatus, now, userId, poId)
    .run();
}

// ----------------------------------------------------
// Dashboard Queries
// ----------------------------------------------------

export interface DashboardStats {
  totalPOAmount: number;
  totalInvoiceAmount: number;
  invoicePendingAmount: number;
  totalPaidAmount: number;
  totalOutstanding: number;
  overdueCount: number;
}

function getFYDateRange(fy: string): { start: string; end: string } {
  const match = fy.match(/^(\d{4})-\d{2}$/);
  if (!match) {
    throw new Error('Invalid financial year format. Expected YYYY-YY (e.g. 2024-25)');
  }
  const startYear = parseInt(match[1], 10);
  const endYear = startYear + 1;
  return {
    start: `${startYear}-04-01`,
    end: `${endYear}-03-31`
  };
}

export async function getDashboardStats(
  db: D1Database,
  userId: number,
  financialYear?: string,
  clientId?: number
): Promise<DashboardStats> {
  let fyStart: string | null = null;
  let fyEnd: string | null = null;
  if (financialYear) {
    const range = getFYDateRange(financialYear);
    fyStart = range.start;
    fyEnd = range.end;
  }

  // Build Invoice WHERE filters
  let invoiceWhere = " AND user_id = ?";
  const invoiceParams: any[] = [userId];
  if (clientId) {
    invoiceWhere += " AND client_id = ?";
    invoiceParams.push(clientId);
  }
  if (fyStart && fyEnd) {
    invoiceWhere += " AND issue_date >= ? AND issue_date <= ?";
    invoiceParams.push(fyStart, fyEnd);
  }

  // 1. Total Outstanding (invoices status != 'cancelled' AND status != 'draft' - outstanding means sent and not paid)
  const outstandingSql = "SELECT SUM(total - amount_paid) as outstanding FROM invoices WHERE status NOT IN ('draft', 'cancelled')" + invoiceWhere;
  const outstandingRes = await db
    .prepare(outstandingSql)
    .bind(...invoiceParams)
    .first<{ outstanding: number | null }>();
  
  // 2. Total Invoice Amount (sum of all invoices except cancelled)
  const totalInvoiceSql = "SELECT SUM(total) as total_amount FROM invoices WHERE status != 'cancelled'" + invoiceWhere;
  const totalInvoiceRes = await db
    .prepare(totalInvoiceSql)
    .bind(...invoiceParams)
    .first<{ total_amount: number | null }>();

  // 3. Total Paid Amount (sum of amount_paid of all invoices except cancelled)
  const totalPaidSql = "SELECT SUM(amount_paid) as total_paid FROM invoices WHERE status != 'cancelled'" + invoiceWhere;
  const totalPaidRes = await db
    .prepare(totalPaidSql)
    .bind(...invoiceParams)
    .first<{ total_paid: number | null }>();

  // 4. Overdue count (status not paid or cancelled, due date passed, amount paid < total)
  const overdueSql = `
    SELECT COUNT(*) as count 
    FROM invoices 
    WHERE status NOT IN ('paid', 'cancelled') 
      AND due_date < DATE('now') 
      AND amount_paid < total
  ` + invoiceWhere;
  const overdueCountRes = await db
    .prepare(overdueSql)
    .bind(...invoiceParams)
    .first<{ count: number | null }>();

  // Build PO WHERE filters
  let poWhere = "status != 'cancelled' AND user_id = ?";
  const poParams: any[] = [userId];
  if (clientId) {
    poWhere += " AND client_id = ?";
    poParams.push(clientId);
  }
  if (fyStart && fyEnd) {
    poWhere += " AND po_date >= ? AND po_date <= ?";
    poParams.push(fyStart, fyEnd);
  }

  // 5. Total PO Amount
  const poSql = "SELECT SUM(amount) as total_po FROM purchase_orders WHERE " + poWhere;
  const totalPORes = await db
    .prepare(poSql)
    .bind(...poParams)
    .first<{ total_po: number | null }>();

  const totalPO = totalPORes?.total_po ?? 0;
  const totalInvoice = totalInvoiceRes?.total_amount ?? 0;
  const invoicePending = Math.max(0, totalPO - totalInvoice);

  return {
    totalPOAmount: totalPO,
    totalInvoiceAmount: totalInvoice,
    invoicePendingAmount: invoicePending,
    totalPaidAmount: totalPaidRes?.total_paid ?? 0,
    totalOutstanding: outstandingRes?.outstanding ?? 0,
    overdueCount: overdueCountRes?.count ?? 0
  };
}

export async function getRecentActivity(
  db: D1Database,
  userId: number,
  financialYear?: string,
  clientId?: number
): Promise<{ recentInvoices: Invoice[]; openPOs: PurchaseOrder[] }> {
  let fyStart: string | null = null;
  let fyEnd: string | null = null;
  if (financialYear) {
    const range = getFYDateRange(financialYear);
    fyStart = range.start;
    fyEnd = range.end;
  }

  // Recent 5 invoices
  let invoiceWhere = "WHERE i.user_id = ?";
  const invoiceParams: any[] = [userId];
  if (clientId) {
    invoiceWhere += " AND i.client_id = ?";
    invoiceParams.push(clientId);
  }
  if (fyStart && fyEnd) {
    invoiceWhere += " AND i.issue_date >= ? AND i.issue_date <= ?";
    invoiceParams.push(fyStart, fyEnd);
  }

  const { results: recentInvoices } = await db
    .prepare(`
      SELECT ${INVOICE_SELECT_FIELDS}
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      LEFT JOIN purchase_orders po ON i.po_id = po.id
      ${invoiceWhere}
      ORDER BY i.issue_date DESC, i.id DESC
      LIMIT 5
    `)
    .bind(...invoiceParams)
    .all<Invoice>();

  // Open Purchase Orders not yet fully invoiced (status is 'open' or 'partially_invoiced')
  let poWhere = "WHERE po.user_id = ? AND po.status IN ('open', 'partially_invoiced')";
  const poParams: any[] = [userId];
  if (clientId) {
    poWhere += " AND po.client_id = ?";
    poParams.push(clientId);
  }
  if (fyStart && fyEnd) {
    poWhere += " AND po.po_date >= ? AND po.po_date <= ?";
    poParams.push(fyStart, fyEnd);
  }

  const { results: openPOs } = await db
    .prepare(`
      SELECT po.*, c.name as client_name
      FROM purchase_orders po
      JOIN clients c ON po.client_id = c.id
      ${poWhere}
      ORDER BY po.po_date DESC, po.id DESC
      LIMIT 5
    `)
    .bind(...poParams)
    .all<PurchaseOrder>();

  return {
    recentInvoices: recentInvoices || [],
    openPOs: openPOs || []
  };
}

export async function getAvailableFinancialYears(db: D1Database, userId: number): Promise<string[]> {
  const query = `
    SELECT DISTINCT
      CASE 
        WHEN CAST(strftime('%m', po_date) AS INTEGER) >= 4 
        THEN strftime('%Y', po_date) || '-' || SUBSTR(CAST(CAST(strftime('%Y', po_date) AS INTEGER) + 1 AS TEXT), 3, 2)
        ELSE CAST(CAST(strftime('%Y', po_date) AS INTEGER) - 1 AS TEXT) || '-' || SUBSTR(strftime('%Y', po_date), 3, 2)
      END as fy
    FROM purchase_orders 
    WHERE user_id = ? AND po_date IS NOT NULL AND status != 'cancelled'
    UNION
    SELECT DISTINCT
      CASE 
        WHEN CAST(strftime('%m', issue_date) AS INTEGER) >= 4 
        THEN strftime('%Y', issue_date) || '-' || SUBSTR(CAST(CAST(strftime('%Y', issue_date) AS INTEGER) + 1 AS TEXT), 3, 2)
        ELSE CAST(CAST(strftime('%Y', issue_date) AS INTEGER) - 1 AS TEXT) || '-' || SUBSTR(strftime('%Y', issue_date), 3, 2)
      END as fy
    FROM invoices 
    WHERE user_id = ? AND issue_date IS NOT NULL AND status != 'cancelled'
  `;
  
  const { results } = await db.prepare(query).bind(userId, userId).all<{ fy: string }>();
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const startYear = currentMonth >= 3 ? currentYear : currentYear - 1;
  const currentFY = `${startYear}-${String(startYear + 1).slice(-2)}`;

  const yearsSet = new Set<string>();
  yearsSet.add(currentFY);
  if (results) {
    for (const row of results) {
      if (row.fy && /^\d{4}-\d{2}$/.test(row.fy)) {
        yearsSet.add(row.fy);
      }
    }
  }

  return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
}

// ----------------------------------------------------
// Export Data Queries
// ----------------------------------------------------

export async function exportClients(db: D1Database, userId: number): Promise<any[]> {
  const { results } = await db.prepare('SELECT * FROM clients WHERE user_id = ? ORDER BY id ASC').bind(userId).all();
  return results || [];
}

export async function exportInvoices(db: D1Database, userId: number): Promise<any[]> {
  const { results } = await db.prepare('SELECT * FROM invoices WHERE user_id = ? ORDER BY id ASC').bind(userId).all();
  return results || [];
}

export async function exportPOs(db: D1Database, userId: number): Promise<any[]> {
  const { results } = await db.prepare('SELECT * FROM purchase_orders WHERE user_id = ? ORDER BY id ASC').bind(userId).all();
  return results || [];
}
