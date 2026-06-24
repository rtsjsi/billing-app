import { Hono } from 'hono';
import { z } from 'zod';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { 
  listInvoices, 
  countInvoices, 
  getInvoiceById, 
  getInvoiceItems, 
  createInvoice, 
  updateInvoice, 
  deleteInvoice,
  updateInvoiceStatus,
  listPaymentsByInvoiceId,
  getSettings
} from '../db/queries';

const app = new Hono<{ Bindings: { DB: D1Database } }>();

const itemSchema = z.object({
  description: z.string().min(1, 'Item description is required'),
  quantity: z.number().min(0, 'Quantity cannot be negative'),
  unit_price: z.number().min(0, 'Unit price cannot be negative'),
  amount: z.number().min(0, 'Amount cannot be negative'),
  sort_order: z.number().int().default(0)
});

const invoiceSchema = z.object({
  client_id: z.number().int('Invalid client ID'),
  po_id: z.number().int().nullable().optional(),
  issue_date: z.string().min(1, 'Issue date is required'),
  due_date: z.string().nullable().optional(),
  status: z.enum(['draft', 'sent', 'partially_paid', 'paid', 'cancelled']).default('draft'),
  currency: z.string().default('INR'),
  subtotal: z.number().min(0),
  tax_label: z.string().nullable().optional(),
  tax_rate: z.number().min(0).default(0),
  tax_amount: z.number().min(0).default(0),
  discount_amount: z.number().min(0).default(0),
  total: z.number().min(0),
  notes: z.string().nullable().optional(),
  terms: z.string().nullable().optional(),
  items: z.array(itemSchema).min(1, 'At least one line item is required')
});

// List invoices with pagination and filters
app.get('/', async (c) => {
  try {
    const status = c.req.query('status') || undefined;
    const clientIdStr = c.req.query('client_id');
    const clientId = clientIdStr ? parseInt(clientIdStr, 10) : undefined;
    const poIdStr = c.req.query('po_id');
    const poId = poIdStr ? parseInt(poIdStr, 10) : undefined;
    const startDate = c.req.query('startDate') || undefined;
    const endDate = c.req.query('endDate') || undefined;
    
    const limit = parseInt(c.req.query('limit') || '20', 10);
    const page = parseInt(c.req.query('page') || '1', 10);
    const offset = (page - 1) * limit;

    const invoices = await listInvoices(c.env.DB, status, clientId, startDate, endDate, limit, offset, poId);
    const total = await countInvoices(c.env.DB, status, clientId, startDate, endDate, poId);

    return c.json({
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to list invoices' }, 500);
  }
});

// Get invoice by ID (includes items & payments)
app.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    if (isNaN(id)) return c.json({ error: 'Invalid invoice ID' }, 400);

    const invoice = await getInvoiceById(c.env.DB, id);
    if (!invoice) return c.json({ error: 'Invoice not found' }, 404);

    const items = await getInvoiceItems(c.env.DB, id);
    const payments = await listPaymentsByInvoiceId(c.env.DB, id);

    return c.json({
      invoice,
      items,
      payments
    });
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to fetch invoice details' }, 500);
  }
});

// Download Invoice PDF
app.get('/:id/pdf', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    if (isNaN(id)) return c.json({ error: 'Invalid invoice ID' }, 400);

    const invoice = await getInvoiceById(c.env.DB, id);
    if (!invoice) return c.json({ error: 'Invoice not found' }, 404);

    const items = await getInvoiceItems(c.env.DB, id);
    const settings = await getSettings(c.env.DB);

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    let y = height - 50;

    const drawText = (text: string, x: number, yPos: number, f: any = font, s: number = 10, color = rgb(0,0,0)) => {
      page.drawText(text || '', { x, y: yPos, font: f, size: s, color });
    };

    // Header
    drawText(settings.business_name, 50, y, boldFont, 20);
    y -= 18;
    if (settings.address) {
      const lines = settings.address.split('\n');
      for (const line of lines) {
        drawText(line, 50, y, font, 9, rgb(0.3, 0.3, 0.3));
        y -= 12;
      }
    }

    // Invoice Details (Right Aligned)
    let ry = height - 50;
    drawText('INVOICE', width - 150, ry, boldFont, 20);
    ry -= 20;
    drawText(`No: ${invoice.invoice_number}`, width - 150, ry, boldFont, 10, rgb(0, 0.4, 0.6));
    ry -= 15;
    drawText(`Issued: ${invoice.issue_date}`, width - 150, ry, font, 9, rgb(0.3, 0.3, 0.3));
    if (invoice.due_date) {
      ry -= 12;
      drawText(`Due: ${invoice.due_date}`, width - 150, ry, font, 9, rgb(0.3, 0.3, 0.3));
    }
    
    y = Math.min(y, ry) - 30;

    // Bill To
    drawText('INVOICED TO', 50, y, boldFont, 8, rgb(0.5, 0.5, 0.5));
    y -= 12;
    drawText(invoice.client_name || '', 50, y, boldFont, 11);
    if (invoice.client_company) {
      y -= 12;
      drawText(invoice.client_company, 50, y, font, 9);
    }

    y -= 30;

    // Table Header
    const tableTop = y;
    page.drawLine({ start: { x: 50, y: tableTop + 10 }, end: { x: width - 50, y: tableTop + 10 }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });
    drawText('Description', 50, tableTop, boldFont, 9);
    drawText('Qty', width - 220, tableTop, boldFont, 9);
    drawText('Rate', width - 160, tableTop, boldFont, 9);
    drawText(`Amount (${invoice.currency})`, width - 100, tableTop, boldFont, 9);
    page.drawLine({ start: { x: 50, y: tableTop - 5 }, end: { x: width - 50, y: tableTop - 5 }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });

    y -= 20;

    // Items
    for (const item of items) {
      drawText(item.description.replace(/\n/g, ' '), 50, y, font, 9);
      drawText(item.quantity.toString(), width - 220, y, font, 9);
      drawText(item.unit_price.toFixed(2), width - 160, y, font, 9);
      drawText(item.amount.toFixed(2), width - 100, y, boldFont, 9);
      y -= 16;
    }

    page.drawLine({ start: { x: 50, y: y + 6 }, end: { x: width - 50, y: y + 6 }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });

    y -= 10;

    // Totals
    drawText('Subtotal:', width - 180, y, font, 9, rgb(0.4, 0.4, 0.4));
    drawText(invoice.subtotal.toFixed(2), width - 100, y, font, 9);
    y -= 15;
    if (invoice.tax_rate > 0) {
      drawText(`${invoice.tax_label || 'Tax'} (${invoice.tax_rate}%):`, width - 180, y, font, 9, rgb(0.4, 0.4, 0.4));
      drawText(invoice.tax_amount.toFixed(2), width - 100, y, font, 9);
      y -= 15;
    }
    if (invoice.discount_amount > 0) {
      drawText('Discount:', width - 180, y, font, 9, rgb(0.4, 0.4, 0.4));
      drawText(`-${invoice.discount_amount.toFixed(2)}`, width - 100, y, font, 9, rgb(0, 0.6, 0.3));
      y -= 15;
    }

    y -= 5;
    page.drawLine({ start: { x: width - 180, y: y + 10 }, end: { x: width - 50, y: y + 10 }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });
    
    drawText('Total Due:', width - 180, y, boldFont, 11);
    drawText(`${invoice.currency} ${invoice.total.toLocaleString(undefined, {minimumFractionDigits: 2})}`, width - 100, y, boldFont, 11);

    if (invoice.amount_paid > 0) {
      y -= 15;
      drawText('Amount Paid:', width - 180, y, font, 9, rgb(0, 0.6, 0.3));
      drawText(`-${invoice.amount_paid.toFixed(2)}`, width - 100, y, font, 9, rgb(0, 0.6, 0.3));
    }

    y -= 40;

    // Bank Details & Notes
    if (settings.bank_name || settings.upi_id) {
      drawText('REMITTANCE INSTRUCTIONS', 50, y, boldFont, 8, rgb(0.5, 0.5, 0.5));
      y -= 12;
      if (settings.bank_name) {
        drawText(`Bank: ${settings.bank_name}`, 50, y, font, 8);
        y -= 12;
        drawText(`A/C Name: ${settings.bank_account_name}`, 50, y, font, 8);
        y -= 12;
        drawText(`A/C No: ${settings.bank_account_number}`, 50, y, font, 8);
        y -= 12;
        drawText(`IFSC: ${settings.bank_ifsc}`, 50, y, font, 8);
        y -= 12;
      }
      if (settings.upi_id) {
        drawText(`UPI ID: ${settings.upi_id}`, 50, y, font, 8);
        y -= 12;
      }
    }

    if (invoice.notes) {
      y -= 10;
      drawText('NOTES', 50, y, boldFont, 8, rgb(0.5, 0.5, 0.5));
      y -= 12;
      drawText(invoice.notes, 50, y, font, 8);
    }

    const pdfBytes = await pdfDoc.save();

    return new Response(pdfBytes as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice_${invoice.invoice_number}.pdf"`
      }
    });

  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to generate PDF' }, 500);
  }
});

// Create Invoice
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = invoiceSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
    }

    const { items, ...invoiceData } = parsed.data;
    const invoiceId = await createInvoice(c.env.DB, invoiceData as any, items);
    const newInvoice = await getInvoiceById(c.env.DB, invoiceId);

    return c.json({ message: 'Invoice created successfully', invoice: newInvoice }, 201);
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to create invoice' }, 500);
  }
});

// Update Invoice
app.put('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    if (isNaN(id)) return c.json({ error: 'Invalid invoice ID' }, 400);

    const body = await c.req.json();
    const parsed = invoiceSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
    }

    const { items, ...invoiceData } = parsed.data;
    await updateInvoice(c.env.DB, id, invoiceData as any, items);
    const updated = await getInvoiceById(c.env.DB, id);

    return c.json({ message: 'Invoice updated successfully', invoice: updated });
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to update invoice' }, 500);
  }
});

// Delete Invoice
app.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    if (isNaN(id)) return c.json({ error: 'Invalid invoice ID' }, 400);

    await deleteInvoice(c.env.DB, id);
    return c.json({ message: 'Invoice deleted successfully' });
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to delete invoice' }, 500);
  }
});

// Mark status (e.g. Sent, Cancelled)
app.post('/:id/status', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    if (isNaN(id)) return c.json({ error: 'Invalid invoice ID' }, 400);

    const body = await c.req.json();
    const { status } = body;
    if (!status || !['draft', 'sent', 'cancelled', 'paid'].includes(status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }

    await updateInvoiceStatus(c.env.DB, id, status);
    return c.json({ message: `Invoice status updated to ${status}` });
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to update invoice status' }, 500);
  }
});

// Duplicate Invoice (clones into new draft)
app.post('/:id/duplicate', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    if (isNaN(id)) return c.json({ error: 'Invalid invoice ID' }, 400);

    const invoice = await getInvoiceById(c.env.DB, id);
    if (!invoice) return c.json({ error: 'Invoice to duplicate not found' }, 404);

    const items = await getInvoiceItems(c.env.DB, id);

    // Strip identifier details and set status to draft
    const clonedInvoice = {
      client_id: invoice.client_id,
      po_id: invoice.po_id,
      issue_date: new Date().toISOString().split('T')[0], // today
      due_date: invoice.due_date,
      status: 'draft' as const,
      currency: invoice.currency,
      subtotal: invoice.subtotal,
      tax_label: invoice.tax_label,
      tax_rate: invoice.tax_rate,
      tax_amount: invoice.tax_amount,
      discount_amount: invoice.discount_amount,
      total: invoice.total,
      notes: invoice.notes,
      terms: invoice.terms
    };

    const clonedItems = items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      amount: item.amount,
      sort_order: item.sort_order
    }));

    const newInvoiceId = await createInvoice(c.env.DB, clonedInvoice, clonedItems);
    const newInvoice = await getInvoiceById(c.env.DB, newInvoiceId);

    return c.json({ message: 'Invoice duplicated successfully', invoice: newInvoice }, 201);
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to duplicate invoice' }, 500);
  }
});

export default app;
