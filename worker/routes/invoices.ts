import { Hono } from 'hono';
import { z } from 'zod';
import { 
  listInvoices, 
  countInvoices, 
  getInvoiceById, 
  getInvoiceItems, 
  createInvoice, 
  updateInvoice, 
  deleteInvoice,
  updateInvoiceStatus,
  listPaymentsByInvoiceId
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
    const startDate = c.req.query('startDate') || undefined;
    const endDate = c.req.query('endDate') || undefined;
    
    const limit = parseInt(c.req.query('limit') || '20', 10);
    const page = parseInt(c.req.query('page') || '1', 10);
    const offset = (page - 1) * limit;

    const invoices = await listInvoices(c.env.DB, status, clientId, startDate, endDate, limit, offset);
    const total = await countInvoices(c.env.DB, status, clientId, startDate, endDate);

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
