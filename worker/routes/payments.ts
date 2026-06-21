import { Hono } from 'hono';
import { z } from 'zod';
import { addPayment, deletePayment } from '../db/queries';

const app = new Hono<{ Bindings: { DB: D1Database } }>();

const paymentSchema = z.object({
  invoice_id: z.number().int('Invalid invoice ID'),
  amount: z.number().positive('Payment amount must be greater than zero'),
  payment_date: z.string().min(1, 'Payment date is required'),
  method: z.enum(['bank_transfer', 'upi', 'cash', 'cheque', 'other']).nullable().optional(),
  reference: z.string().nullable().optional(),
  notes: z.string().nullable().optional()
});

// Record Payment
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
    }

    const { invoice_id, amount, payment_date, method, reference, notes } = parsed.data;
    
    const paymentId = await addPayment(
      c.env.DB,
      invoice_id,
      amount,
      payment_date,
      method || null,
      reference || null,
      notes || null
    );

    return c.json({ message: 'Payment recorded successfully', paymentId }, 201);
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to record payment' }, 500);
  }
});

// Delete Payment
app.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    if (isNaN(id)) return c.json({ error: 'Invalid payment ID' }, 400);

    await deletePayment(c.env.DB, id);
    return c.json({ message: 'Payment deleted successfully' });
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to delete payment' }, 500);
  }
});

export default app;
