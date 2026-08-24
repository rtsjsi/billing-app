import { D1Database } from '@cloudflare/workers-types';
import {
  getClientById,
  getDashboardStats,
  getFYDateRange,
  getSettings,
  listClients,
  listPOs,
  type BusinessSettings,
  type PurchaseOrder,
} from '../db/queries';
import { uncheckedWorkSql } from './po-work';
import { formatAmount, paymentMethodLabel, roundMoney } from './report-format';
import type { ExcelCell, ExcelSheet } from './xlsx';
import type { PdfColumn, PdfTableReport } from './pdf-report';

export const REPORT_TYPES = [
  'summary',
  'invoices',
  'outstanding',
  'tax',
  'payments',
  'purchase-orders',
  'unconfirmed-pos',
  'clients',
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export function isReportType(value: string): value is ReportType {
  return (REPORT_TYPES as readonly string[]).includes(value);
}

type ReportFilters = {
  financialYear?: string;
  clientId?: number;
};

type BuiltReport = {
  slug: string;
  title: string;
  filenameTitle: string;
  subtitle: string;
  businessName: string;
  generatedAt: string;
  orientation: 'portrait' | 'landscape';
  columns: PdfColumn[];
  rows: string[][];
  totals?: string[];
  excelSheets: ExcelSheet[];
};

type InvoiceRow = {
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  client_id: number;
  client_name: string;
  client_gstin: string | null;
  po_number: string | null;
  status: string;
  subtotal: number;
  tax_label: string | null;
  tax_rate: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  aging?: string;
};

type PaymentRow = {
  payment_date: string;
  invoice_number: string;
  client_name: string;
  method: string | null;
  reference: string | null;
  amount: number;
};

type UnconfirmedRow = {
  po_number: string;
  po_date: string | null;
  client_name: string;
  item_description: string;
  item_amount: number;
};

type ClientRow = {
  name: string;
  tds_percent: number;
  confirmed_po: number;
  unconfirmed_po: number;
  invoiced: number;
  collected: number;
};

function num(value: number | null | undefined): number {
  return roundMoney(Number(value) || 0);
}

function fyRange(financialYear?: string): { start?: string; end?: string } {
  if (!financialYear) return {};
  return getFYDateRange(financialYear);
}

function cellS(value: string | number | null | undefined): ExcelCell {
  return { type: 'string', value: value == null || value === '' ? '' : String(value) };
}

function cellN(value: number | null | undefined): ExcelCell {
  return { type: 'number', value: num(value) };
}

async function subtitleFor(
  db: D1Database,
  userId: number,
  filters: ReportFilters
): Promise<string> {
  const parts = [filters.financialYear ? `FY ${filters.financialYear}` : 'All years'];
  if (filters.clientId) {
    const client = await getClientById(db, userId, filters.clientId);
    if (client) parts.push(client.name);
  }
  return parts.join('  ·  ');
}

function invoiceWhere(userId: number, filters: ReportFilters, extra = '') {
  const binds: unknown[] = [userId];
  let sql = 'i.user_id = ?';
  if (filters.clientId) {
    sql += ' AND i.client_id = ?';
    binds.push(filters.clientId);
  }
  const range = fyRange(filters.financialYear);
  if (range.start && range.end) {
    sql += ' AND i.issue_date >= ? AND i.issue_date <= ?';
    binds.push(range.start, range.end);
  }
  if (extra) sql += ` ${extra}`;
  return { sql, binds };
}

function poWhere(userId: number, filters: ReportFilters) {
  const binds: unknown[] = [userId];
  let sql = "po.user_id = ? AND po.status != 'cancelled'";
  if (filters.clientId) {
    sql += ' AND po.client_id = ?';
    binds.push(filters.clientId);
  }
  const range = fyRange(filters.financialYear);
  if (range.start && range.end) {
    sql += ' AND po.po_date >= ? AND po.po_date <= ?';
    binds.push(range.start, range.end);
  }
  return { sql, binds };
}

async function listInvoiceRows(
  db: D1Database,
  userId: number,
  filters: ReportFilters,
  extra = '',
  extraBinds: unknown[] = []
): Promise<InvoiceRow[]> {
  const where = invoiceWhere(userId, filters, extra);
  const { results } = await db
    .prepare(
      `SELECT
         i.invoice_number,
         i.issue_date,
         i.due_date,
         i.client_id,
         c.name as client_name,
         c.gstin as client_gstin,
         po.po_number as po_number,
         CASE
           WHEN i.status NOT IN ('paid', 'cancelled') AND i.due_date < DATE('now') AND i.amount_paid < i.total THEN 'overdue'
           ELSE i.status
         END as status,
         i.subtotal,
         i.tax_label,
         i.tax_rate,
         i.tax_amount,
         i.total,
         i.amount_paid,
         CASE
           WHEN i.due_date IS NULL THEN 'No due date'
           WHEN i.due_date >= DATE('now') THEN 'Not due'
           WHEN julianday('now') - julianday(i.due_date) <= 30 THEN '1-30 days'
           WHEN julianday('now') - julianday(i.due_date) <= 60 THEN '31-60 days'
           WHEN julianday('now') - julianday(i.due_date) <= 90 THEN '61-90 days'
           ELSE '90+ days'
         END as aging
       FROM invoices i
       JOIN clients c ON i.client_id = c.id
       LEFT JOIN purchase_orders po ON i.po_id = po.id
       WHERE ${where.sql}
       ORDER BY i.issue_date DESC, i.id DESC`
    )
    .bind(...where.binds, ...extraBinds)
    .all<InvoiceRow>();
  return results || [];
}

async function listPaymentRows(
  db: D1Database,
  userId: number,
  filters: ReportFilters
): Promise<PaymentRow[]> {
  const binds: unknown[] = [userId];
  let sql = "i.user_id = ? AND i.status != 'cancelled'";
  if (filters.clientId) {
    sql += ' AND i.client_id = ?';
    binds.push(filters.clientId);
  }
  const range = fyRange(filters.financialYear);
  if (range.start && range.end) {
    sql += ' AND p.payment_date >= ? AND p.payment_date <= ?';
    binds.push(range.start, range.end);
  }
  const { results } = await db
    .prepare(
      `SELECT p.payment_date, i.invoice_number, c.name as client_name, p.method, p.reference, p.amount
       FROM payments p
       JOIN invoices i ON p.invoice_id = i.id
       JOIN clients c ON i.client_id = c.id
       WHERE ${sql}
       ORDER BY p.payment_date DESC, p.id DESC`
    )
    .bind(...binds)
    .all<PaymentRow>();
  return results || [];
}

async function listUnconfirmedRows(
  db: D1Database,
  userId: number,
  filters: ReportFilters
): Promise<UnconfirmedRow[]> {
  const where = poWhere(userId, filters);
  const { results } = await db
    .prepare(
      `SELECT po.po_number, po.po_date, c.name as client_name, poi.description as item_description, poi.amount as item_amount
       FROM purchase_order_items poi
       JOIN purchase_orders po ON poi.po_id = po.id
       JOIN clients c ON po.client_id = c.id
       WHERE ${uncheckedWorkSql('poi.work_confirmed')} AND ${where.sql}
       ORDER BY po.po_date DESC, po.id DESC, poi.sort_order ASC, poi.id ASC`
    )
    .bind(...where.binds)
    .all<UnconfirmedRow>();
  return results || [];
}

async function listClientRows(
  db: D1Database,
  userId: number,
  filters: ReportFilters
): Promise<ClientRow[]> {
  const clients = filters.clientId
    ? [await getClientById(db, userId, filters.clientId)].filter(
        (client): client is NonNullable<typeof client> => Boolean(client)
      )
    : await listClients(db, userId, false);

  const range = fyRange(filters.financialYear);
  const pos = (await listPOs(db, userId, filters.clientId)).filter((po) => {
    if (po.status === 'cancelled') return false;
    if (range.start && range.end) {
      if (!po.po_date) return false;
      return po.po_date >= range.start && po.po_date <= range.end;
    }
    return true;
  });
  const invoices = await listInvoiceRows(db, userId, filters, "AND i.status != 'cancelled'");

  return clients.map((client) => {
    const clientPos = pos.filter((po) => po.client_id === client.id);
    const clientInvoices = invoices.filter((inv) => inv.client_id === client.id);
    return {
      name: client.name,
      tds_percent: num(client.tds_percent),
      confirmed_po: roundMoney(clientPos.reduce((sum, po) => sum + num(po.confirmed_amount), 0)),
      unconfirmed_po: roundMoney(clientPos.reduce((sum, po) => sum + num(po.unconfirmed_amount), 0)),
      invoiced: roundMoney(clientInvoices.reduce((sum, inv) => sum + num(inv.total), 0)),
      collected: roundMoney(clientInvoices.reduce((sum, inv) => sum + num(inv.amount_paid), 0)),
    };
  });
}

function sumColumn(rows: ExcelCell[][], index: number): number {
  return roundMoney(
    rows.reduce((total, row) => {
      const cell = row[index];
      if (cell?.type === 'number') return total + num(cell.value);
      return total;
    }, 0)
  );
}

function excelWithTotals(name: string, headers: string[], rows: ExcelCell[][], totalIndexes: number[]): ExcelSheet {
  if (rows.length === 0) {
    return { name, headers, rows };
  }
  const totals: ExcelCell[] = headers.map((header, i) => {
    if (i === 0) return cellS('Total');
    if (totalIndexes.includes(i)) return cellN(sumColumn(rows, i));
    return cellS('');
  });
  return { name, headers, rows: [...rows, totals] };
}

function pdfTotalsFromExcel(headers: string[], rows: ExcelCell[][], totalIndexes: number[]): string[] | undefined {
  if (rows.length === 0) return undefined;
  return headers.map((header, i) => {
    if (i === 0) return 'Total';
    if (totalIndexes.includes(i)) return formatAmount(sumColumn(rows, i));
    return '';
  });
}

function pdfRowsFromExcel(rows: ExcelCell[][]): string[][] {
  return rows.map((row) =>
    row.map((cell) => {
      if (cell.type === 'number') return formatAmount(cell.value);
      const value = cell.value;
      return value == null || value === '' ? '—' : String(value);
    })
  );
}

function meta(
  settings: BusinessSettings,
  title: string,
  filenameTitle: string,
  subtitle: string,
  slug: string
) {
  return {
    slug,
    title,
    filenameTitle,
    subtitle,
    businessName: settings.business_name,
    generatedAt: `Generated ${new Date().toISOString().slice(0, 10)}`,
  };
}

async function buildSummary(
  db: D1Database,
  userId: number,
  settings: BusinessSettings,
  filters: ReportFilters,
  subtitle: string
): Promise<BuiltReport> {
  const stats = await getDashboardStats(db, userId, filters.financialYear, filters.clientId);
  const metrics: { label: string; amount: number }[] = [
    { label: 'Unconfirmed PO', amount: num(stats.totalUnconfirmedPOAmount) },
    { label: 'Confirmed PO', amount: num(stats.totalPOAmount) },
    { label: 'Invoiced', amount: num(stats.totalInvoiceAmount) },
    { label: 'Yet to invoice', amount: num(stats.invoicePendingAmount) },
    { label: 'Outstanding', amount: num(stats.totalOutstanding) },
    { label: 'Collected', amount: num(stats.totalPaidAmount) },
  ];
  const columns: PdfColumn[] = [
    { header: 'Metric', width: 3 },
    { header: 'Amount', width: 2, align: 'right' },
  ];
  const excelRows = metrics.map((row) => [cellS(row.label), cellN(row.amount)]);
  excelRows.push([cellS('Overdue invoices'), cellS(String(stats.overdueCount ?? 0))]);

  return {
    ...meta(settings, 'Billing summary', 'billing-summary', subtitle, 'summary'),
    orientation: 'portrait',
    columns,
    rows: [
      ...metrics.map((row) => [row.label, formatAmount(row.amount)]),
      ['Overdue invoices', String(stats.overdueCount ?? 0)],
    ],
    excelSheets: [{ name: 'Summary', headers: ['Metric', 'Amount'], rows: excelRows }],
  };
}

async function buildInvoiceRegister(
  db: D1Database,
  userId: number,
  settings: BusinessSettings,
  filters: ReportFilters,
  subtitle: string
): Promise<BuiltReport> {
  const invoices = await listInvoiceRows(db, userId, filters, "AND i.status != 'cancelled'");
  const columns: PdfColumn[] = [
    { header: 'Invoice', width: 1.4 },
    { header: 'Date', width: 1.1 },
    { header: 'Client', width: 1.6 },
    { header: 'PO', width: 1.2 },
    { header: 'Status', width: 1 },
    { header: 'Taxable', width: 1.1, align: 'right' },
    { header: 'Tax', width: 1, align: 'right' },
    { header: 'Total', width: 1.1, align: 'right' },
    { header: 'Paid', width: 1.1, align: 'right' },
    { header: 'Balance', width: 1.1, align: 'right' },
  ];
  const headers = columns.map((c) => c.header);
  const excelRows = invoices.map((inv) => [
    cellS(inv.invoice_number),
    cellS(inv.issue_date),
    cellS(inv.client_name),
    cellS(inv.po_number || ''),
    cellS(inv.status),
    cellN(inv.subtotal),
    cellN(inv.tax_amount),
    cellN(inv.total),
    cellN(inv.amount_paid),
    cellN(Math.max(0, num(inv.total) - num(inv.amount_paid))),
  ]);
  const sheet = excelWithTotals('Invoices', headers, excelRows, [5, 6, 7, 8, 9]);
  return {
    ...meta(settings, 'Invoice register', 'invoice-register', subtitle, 'invoices'),
    orientation: 'landscape',
    columns,
    rows: pdfRowsFromExcel(excelRows),
    totals: pdfTotalsFromExcel(headers, excelRows, [5, 6, 7, 8, 9]),
    excelSheets: [sheet],
  };
}

async function buildOutstanding(
  db: D1Database,
  userId: number,
  settings: BusinessSettings,
  filters: ReportFilters,
  subtitle: string
): Promise<BuiltReport> {
  const invoices = await listInvoiceRows(
    db,
    userId,
    filters,
    "AND i.status NOT IN ('draft', 'cancelled', 'paid') AND i.amount_paid < i.total"
  );
  const columns: PdfColumn[] = [
    { header: 'Invoice', width: 1.4 },
    { header: 'Issued', width: 1.1 },
    { header: 'Due', width: 1.1 },
    { header: 'Client', width: 1.8 },
    { header: 'Aging', width: 1.2 },
    { header: 'Total', width: 1.2, align: 'right' },
    { header: 'Paid', width: 1.2, align: 'right' },
    { header: 'Outstanding', width: 1.3, align: 'right' },
  ];
  const headers = columns.map((c) => c.header);
  const excelRows = invoices.map((inv) => [
    cellS(inv.invoice_number),
    cellS(inv.issue_date),
    cellS(inv.due_date || ''),
    cellS(inv.client_name),
    cellS(inv.aging || ''),
    cellN(inv.total),
    cellN(inv.amount_paid),
    cellN(Math.max(0, num(inv.total) - num(inv.amount_paid))),
  ]);
  const sheet = excelWithTotals('Outstanding', headers, excelRows, [5, 6, 7]);
  return {
    ...meta(settings, 'Outstanding invoices', 'outstanding-invoices', subtitle, 'outstanding'),
    orientation: 'landscape',
    columns,
    rows: pdfRowsFromExcel(excelRows),
    totals: pdfTotalsFromExcel(headers, excelRows, [5, 6, 7]),
    excelSheets: [sheet],
  };
}

async function buildTax(
  db: D1Database,
  userId: number,
  settings: BusinessSettings,
  filters: ReportFilters,
  subtitle: string
): Promise<BuiltReport> {
  const invoices = await listInvoiceRows(db, userId, filters, "AND i.status != 'cancelled'");
  const taxLabel = settings.tax_label || 'Tax';
  const columns: PdfColumn[] = [
    { header: 'Invoice', width: 1.4 },
    { header: 'Date', width: 1.1 },
    { header: 'Client', width: 1.8 },
    { header: 'GSTIN', width: 1.5 },
    { header: 'Taxable', width: 1.2, align: 'right' },
    { header: 'Rate %', width: 0.9, align: 'right' },
    { header: taxLabel, width: 1.2, align: 'right' },
    { header: 'Total', width: 1.2, align: 'right' },
  ];
  const headers = columns.map((c) => c.header);
  const excelRows = invoices.map((inv) => [
    cellS(inv.invoice_number),
    cellS(inv.issue_date),
    cellS(inv.client_name),
    cellS(inv.client_gstin || ''),
    cellN(inv.subtotal),
    cellN(inv.tax_rate),
    cellN(inv.tax_amount),
    cellN(inv.total),
  ]);
  const sheet = excelWithTotals(taxLabel, headers, excelRows, [4, 6, 7]);
  return {
    ...meta(settings, `${taxLabel} register`, 'tax-register', subtitle, 'tax'),
    orientation: 'landscape',
    columns,
    rows: pdfRowsFromExcel(excelRows),
    totals: pdfTotalsFromExcel(headers, excelRows, [4, 6, 7]),
    excelSheets: [sheet],
  };
}

async function buildPayments(
  db: D1Database,
  userId: number,
  settings: BusinessSettings,
  filters: ReportFilters,
  subtitle: string
): Promise<BuiltReport> {
  const payments = await listPaymentRows(db, userId, filters);
  const columns: PdfColumn[] = [
    { header: 'Date', width: 1.2 },
    { header: 'Invoice', width: 1.4 },
    { header: 'Client', width: 2 },
    { header: 'Method', width: 1.3 },
    { header: 'Reference', width: 1.6 },
    { header: 'Amount', width: 1.3, align: 'right' },
  ];
  const headers = columns.map((c) => c.header);
  const excelRows = payments.map((pmt) => [
    cellS(pmt.payment_date),
    cellS(pmt.invoice_number),
    cellS(pmt.client_name),
    cellS(paymentMethodLabel(pmt.method)),
    cellS(pmt.reference || ''),
    cellN(pmt.amount),
  ]);
  const sheet = excelWithTotals('Payments', headers, excelRows, [5]);
  return {
    ...meta(settings, 'Collections register', 'collections-register', subtitle, 'payments'),
    orientation: 'landscape',
    columns,
    rows: pdfRowsFromExcel(excelRows),
    totals: pdfTotalsFromExcel(headers, excelRows, [5]),
    excelSheets: [sheet],
  };
}

async function buildPurchaseOrders(
  db: D1Database,
  userId: number,
  settings: BusinessSettings,
  filters: ReportFilters,
  subtitle: string
): Promise<BuiltReport> {
  const pos = await listPOs(db, userId, filters.clientId);
  const range = fyRange(filters.financialYear);
  const filtered = pos.filter((po) => {
    if (po.status === 'cancelled') return false;
    if (range.start && range.end) {
      if (!po.po_date) return false;
      return po.po_date >= range.start && po.po_date <= range.end;
    }
    return true;
  });
  const columns: PdfColumn[] = [
    { header: 'PO', width: 1.5 },
    { header: 'Date', width: 1.1 },
    { header: 'Client', width: 1.8 },
    { header: 'Status', width: 0.9 },
    { header: 'Total', width: 1.1, align: 'right' },
    { header: 'Confirmed', width: 1.2, align: 'right' },
    { header: 'Unconfirmed', width: 1.2, align: 'right' },
    { header: 'Invoiced', width: 1.1, align: 'right' },
    { header: 'Yet to invoice', width: 1.3, align: 'right' },
  ];
  const headers = columns.map((c) => c.header);
  const excelRows = filtered.map((po: PurchaseOrder) => {
    const confirmed = num(po.confirmed_amount);
    const unconfirmed = num(po.unconfirmed_amount);
    const invoiced = num(po.invoiced_amount);
    return [
      cellS(po.po_number),
      cellS(po.po_date || ''),
      cellS(po.client_name || ''),
      cellS(po.status),
      cellN(po.amount),
      cellN(confirmed),
      cellN(unconfirmed),
      cellN(invoiced),
      cellN(Math.max(0, confirmed - invoiced)),
    ];
  });
  const sheet = excelWithTotals('Purchase orders', headers, excelRows, [4, 5, 6, 7, 8]);
  return {
    ...meta(settings, 'Purchase order register', 'po-register', subtitle, 'purchase-orders'),
    orientation: 'landscape',
    columns,
    rows: pdfRowsFromExcel(excelRows),
    totals: pdfTotalsFromExcel(headers, excelRows, [4, 5, 6, 7, 8]),
    excelSheets: [sheet],
  };
}

async function buildUnconfirmed(
  db: D1Database,
  userId: number,
  settings: BusinessSettings,
  filters: ReportFilters,
  subtitle: string
): Promise<BuiltReport> {
  const items = await listUnconfirmedRows(db, userId, filters);
  const columns: PdfColumn[] = [
    { header: 'PO', width: 1.5 },
    { header: 'Date', width: 1.2 },
    { header: 'Client', width: 2 },
    { header: 'Line item', width: 3.2 },
    { header: 'Amount', width: 1.3, align: 'right' },
  ];
  const headers = columns.map((c) => c.header);
  const excelRows = items.map((item) => [
    cellS(item.po_number),
    cellS(item.po_date || ''),
    cellS(item.client_name),
    cellS(item.item_description),
    cellN(item.item_amount),
  ]);
  const sheet = excelWithTotals('Unconfirmed', headers, excelRows, [4]);
  return {
    ...meta(settings, 'Unconfirmed PO lines', 'unconfirmed-pos', subtitle, 'unconfirmed-pos'),
    orientation: 'landscape',
    columns,
    rows: pdfRowsFromExcel(excelRows),
    totals: pdfTotalsFromExcel(headers, excelRows, [4]),
    excelSheets: [sheet],
  };
}

async function buildClients(
  db: D1Database,
  userId: number,
  settings: BusinessSettings,
  filters: ReportFilters,
  subtitle: string
): Promise<BuiltReport> {
  const clients = await listClientRows(db, userId, filters);
  const columns: PdfColumn[] = [
    { header: 'Client', width: 2 },
    { header: 'TDS %', width: 0.8, align: 'right' },
    { header: 'Confirmed PO', width: 1.3, align: 'right' },
    { header: 'Unconfirmed', width: 1.2, align: 'right' },
    { header: 'Invoiced', width: 1.2, align: 'right' },
    { header: 'Collected', width: 1.2, align: 'right' },
    { header: 'Outstanding', width: 1.2, align: 'right' },
    { header: 'Est. TDS', width: 1.1, align: 'right' },
  ];
  const headers = columns.map((c) => c.header);
  const excelRows = clients.map((client) => {
    const outstanding = Math.max(0, num(client.invoiced) - num(client.collected));
    const tds = roundMoney(num(client.collected) * num(client.tds_percent) / 100);
    return [
      cellS(client.name),
      cellN(client.tds_percent),
      cellN(client.confirmed_po),
      cellN(client.unconfirmed_po),
      cellN(client.invoiced),
      cellN(client.collected),
      cellN(outstanding),
      cellN(tds),
    ];
  });
  const sheet = excelWithTotals('Clients', headers, excelRows, [2, 3, 4, 5, 6, 7]);
  return {
    ...meta(settings, 'Client-wise summary', 'client-summary', subtitle, 'clients'),
    orientation: 'landscape',
    columns,
    rows: pdfRowsFromExcel(excelRows),
    totals: pdfTotalsFromExcel(headers, excelRows, [2, 3, 4, 5, 6, 7]),
    excelSheets: [sheet],
  };
}

export async function buildReport(
  db: D1Database,
  userId: number,
  type: ReportType,
  filters: ReportFilters
): Promise<BuiltReport> {
  const settings = await getSettings(db, userId);
  const subtitle = await subtitleFor(db, userId, filters);
  switch (type) {
    case 'summary':
      return buildSummary(db, userId, settings, filters, subtitle);
    case 'invoices':
      return buildInvoiceRegister(db, userId, settings, filters, subtitle);
    case 'outstanding':
      return buildOutstanding(db, userId, settings, filters, subtitle);
    case 'tax':
      return buildTax(db, userId, settings, filters, subtitle);
    case 'payments':
      return buildPayments(db, userId, settings, filters, subtitle);
    case 'purchase-orders':
      return buildPurchaseOrders(db, userId, settings, filters, subtitle);
    case 'unconfirmed-pos':
      return buildUnconfirmed(db, userId, settings, filters, subtitle);
    case 'clients':
      return buildClients(db, userId, settings, filters, subtitle);
  }
}

export function toPdfInput(report: BuiltReport): PdfTableReport {
  return {
    title: report.title,
    subtitle: report.subtitle,
    businessName: report.businessName,
    generatedAt: report.generatedAt,
    orientation: report.orientation,
    columns: report.columns,
    rows: report.rows,
    totals: report.totals,
  };
}

export function reportFilename(report: BuiltReport, extension: 'pdf' | 'xlsx', financialYear?: string): string {
  const fy = financialYear ? `-FY${financialYear}` : '';
  return `${report.filenameTitle}${fy}.${extension}`;
}
