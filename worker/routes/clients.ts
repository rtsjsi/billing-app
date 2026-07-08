import { Hono } from 'hono';
import { z } from 'zod';
import { 
  listClients, 
  getClientById, 
  createClient, 
  updateClient, 
  getClientReferences, 
  deleteClient,
  listInvoices,
  listPOs
} from '../db/queries';

const app = new Hono<{ Bindings: { DB: D1Database }, Variables: { jwtPayload: { userId: number, username: string } } }>();

const clientSchema = z.object({
  name: z.string().min(1, 'Client name is required'),
  company_name: z.string().nullable().optional(),
  email: z.string().email('Invalid email address').or(z.literal('')).nullable().optional(),
  phone: z.string().nullable().optional(),
  billing_address: z.string().nullable().optional(),
  gstin: z.string().nullable().optional(),
  notes: z.string().nullable().optional()
});

// List clients
app.get('/', async (c) => {
  try {
    const userId = c.get('jwtPayload').userId;
    const includeArchived = c.req.query('includeArchived') === 'true';
    const search = c.req.query('search') || '';
    const clients = await listClients(c.env.DB, userId, includeArchived, search);
    return c.json(clients);
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to list clients' }, 500);
  }
});

// Get client by ID (includes linked invoices and POs)
app.get('/:id', async (c) => {
  try {
    const userId = c.get('jwtPayload').userId;
    const id = parseInt(c.req.param('id'), 10);
    if (isNaN(id)) return c.json({ error: 'Invalid client ID' }, 400);

    const client = await getClientById(c.env.DB, userId, id);
    if (!client) return c.json({ error: 'Client not found' }, 404);

    // Fetch invoice history and linked POs
    const invoices = await listInvoices(c.env.DB, userId, undefined, id, undefined, undefined, 100, 0);
    const pos = await listPOs(c.env.DB, userId, id);

    return c.json({
      client,
      invoices,
      pos
    });
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to fetch client details' }, 500);
  }
});

// Create client
app.post('/', async (c) => {
  try {
    const userId = c.get('jwtPayload').userId;
    const body = await c.req.json();
    const parsed = clientSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
    }

    const clientId = await createClient(c.env.DB, userId, {
      name: parsed.data.name,
      company_name: parsed.data.company_name ?? null,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      billing_address: parsed.data.billing_address ?? null,
      gstin: parsed.data.gstin ?? null,
      notes: parsed.data.notes ?? null
    });
    const newClient = await getClientById(c.env.DB, userId, clientId);
    return c.json({ message: 'Client created successfully', client: newClient }, 201);
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to create client' }, 500);
  }
});

// Update client
app.put('/:id', async (c) => {
  try {
    const userId = c.get('jwtPayload').userId;
    const id = parseInt(c.req.param('id'), 10);
    if (isNaN(id)) return c.json({ error: 'Invalid client ID' }, 400);

    const body = await c.req.json();
    const parsed = clientSchema.partial().safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
    }

    await updateClient(c.env.DB, userId, id, parsed.data);
    const updated = await getClientById(c.env.DB, userId, id);
    return c.json({ message: 'Client updated successfully', client: updated });
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to update client' }, 500);
  }
});

// Archive client
app.post('/:id/archive', async (c) => {
  try {
    const userId = c.get('jwtPayload').userId;
    const id = parseInt(c.req.param('id'), 10);
    if (isNaN(id)) return c.json({ error: 'Invalid client ID' }, 400);

    await updateClient(c.env.DB, userId, id, { is_archived: 1 });
    return c.json({ message: 'Client archived successfully' });
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to archive client' }, 500);
  }
});

// Unarchive client
app.post('/:id/unarchive', async (c) => {
  try {
    const userId = c.get('jwtPayload').userId;
    const id = parseInt(c.req.param('id'), 10);
    if (isNaN(id)) return c.json({ error: 'Invalid client ID' }, 400);

    await updateClient(c.env.DB, userId, id, { is_archived: 0 });
    return c.json({ message: 'Client unarchived successfully' });
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to unarchive client' }, 500);
  }
});

// Delete client (blocked if referenced by POs or Invoices)
app.delete('/:id', async (c) => {
  try {
    const userId = c.get('jwtPayload').userId;
    const id = parseInt(c.req.param('id'), 10);
    if (isNaN(id)) return c.json({ error: 'Invalid client ID' }, 400);

    const refs = await getClientReferences(c.env.DB, userId, id);
    if (refs.invoices > 0 || refs.pos > 0) {
      return c.json({ 
        error: 'Cannot delete client. This client is referenced by existing invoices or purchase orders. Please archive them instead.',
        references: refs
      }, 409);
    }

    await deleteClient(c.env.DB, userId, id);
    return c.json({ message: 'Client deleted successfully' });
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to delete client' }, 500);
  }
});

export default app;
