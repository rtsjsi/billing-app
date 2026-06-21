import { Hono } from 'hono';
import { z } from 'zod';
import { 
  listPOs, 
  getPOById, 
  createPO, 
  updatePO, 
  deletePO 
} from '../db/queries';

const app = new Hono<{ Bindings: { DB: D1Database; ATTACHMENTS: R2Bucket } }>();

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

    // Delete attachment from R2 if exists
    if (po.attachment_key && c.env.ATTACHMENTS) {
      try {
        await c.env.ATTACHMENTS.delete(po.attachment_key);
      } catch (err) {
        console.error('Failed to delete attachment from R2', err);
      }
    }

    await deletePO(c.env.DB, id);
    return c.json({ message: 'Purchase Order deleted successfully' });
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to delete Purchase Order' }, 500);
  }
});

// File Upload to R2 Bucket
app.post('/upload', async (c) => {
  try {
    const bucket = c.env.ATTACHMENTS;
    if (!bucket) {
      return c.json({ error: 'R2 attachments storage bucket binding is not configured. Please bind ATTACHMENTS.' }, 500);
    }

    const body = await c.req.parseBody();
    const file = body.file as File;
    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    const randomId = crypto.randomUUID();
    const cleanFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `po-attachments/${randomId}-${cleanFilename}`;

    await bucket.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream',
        contentDisposition: `inline; filename="${cleanFilename}"`
      }
    });

    return c.json({ key, filename: file.name }, 200);
  } catch (error: any) {
    return c.json({ error: error.message || 'File upload failed' }, 500);
  }
});

// Download attachment from R2
app.get('/attachment/*', async (c) => {
  try {
    const bucket = c.env.ATTACHMENTS;
    if (!bucket) {
      return c.json({ error: 'R2 attachments storage bucket binding is not configured' }, 500);
    }

    // Extract path after /attachment/
    const prefixPath = '/api/purchase-orders/attachment/';
    const key = c.req.path.substring(prefixPath.length);

    if (!key) {
      return c.json({ error: 'No file key specified' }, 400);
    }

    const object = await bucket.get(key);
    if (!object) {
      return c.json({ error: 'File attachment not found' }, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'max-age=31536000');

    return new Response(object.body, { headers });
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to download attachment' }, 500);
  }
});

export default app;
