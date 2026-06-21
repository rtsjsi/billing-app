import { Hono } from 'hono';
import { z } from 'zod';
import { 
  listPOs, 
  getPOById, 
  createPO, 
  updatePO, 
  deletePO 
} from '../db/queries';

const app = new Hono<{ Bindings: { DB: D1Database } }>();

const poSchema = z.object({
  client_id: z.number().int('Invalid client ID'),
  po_number: z.string().min(1, 'PO number is required'),
  po_date: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  amount: z.number().min(0).nullable().optional(),
  currency: z.string().default('INR'),
  status: z.enum(['open', 'partially_invoiced', 'fulfilled', 'cancelled']).default('open'),
  attachment_key: z.string().nullable().optional(),
  notes: z.string().nullable().optional()
});

// List Purchase Orders
app.get('/', async (c) => {
  try {
    const clientIdStr = c.req.query('client_id');
    const clientId = clientIdStr ? parseInt(clientIdStr, 10) : undefined;
    const status = c.req.query('status') || undefined;
    
    const pos = await listPOs(c.env.DB, clientId, status);
    return c.json(pos);
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to list Purchase Orders' }, 500);
  }
});

// Get PO by ID
app.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    if (isNaN(id)) return c.json({ error: 'Invalid PO ID' }, 400);

    const po = await getPOById(c.env.DB, id);
    if (!po) return c.json({ error: 'Purchase Order not found' }, 404);

    return c.json(po);
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to fetch Purchase Order' }, 500);
  }
});

// Create PO
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = poSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
    }

    const poId = await createPO(c.env.DB, parsed.data as any);
    const newPO = await getPOById(c.env.DB, poId);
    return c.json({ message: 'Purchase Order created successfully', po: newPO }, 201);
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to create Purchase Order' }, 500);
  }
});

// Update PO
app.put('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    if (isNaN(id)) return c.json({ error: 'Invalid PO ID' }, 400);

    const body = await c.req.json();
    const parsed = poSchema.partial().safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
    }

    await updatePO(c.env.DB, id, parsed.data);
    const updated = await getPOById(c.env.DB, id);
    return c.json({ message: 'Purchase Order updated successfully', po: updated });
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to update Purchase Order' }, 500);
  }
});

// Delete PO
app.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    if (isNaN(id)) return c.json({ error: 'Invalid PO ID' }, 400);

    const po = await getPOById(c.env.DB, id);
    if (!po) return c.json({ error: 'Purchase Order not found' }, 404);


    await deletePO(c.env.DB, id);
    return c.json({ message: 'Purchase Order deleted successfully' });
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to delete Purchase Order' }, 500);
  }
});

export default app;
