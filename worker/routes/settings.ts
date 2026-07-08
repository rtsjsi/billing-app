import { Hono } from 'hono';
import { z } from 'zod';
import { 
  getSettings, 
  updateSettings, 
  updateUserPassword, 
  getUserByUsername,
  exportClients,
  exportInvoices,
  exportPOs
} from '../db/queries';
import { hashPassword, generateSalt } from '../auth';
import { checkRateLimit } from '../lib/rate-limit';

const app = new Hono<{ Bindings: { DB: D1Database }; Variables: { jwtPayload: { userId: number, username: string } } }>();

const settingsSchema = z.object({
  business_name: z.string().min(1, 'Business name is required'),
  owner_name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  gstin: z.string().nullable().optional(),
  pan: z.string().nullable().optional(),
  bank_account_name: z.string().nullable().optional(),
  bank_account_number: z.string().nullable().optional(),
  bank_ifsc: z.string().nullable().optional(),
  bank_name: z.string().nullable().optional(),
  upi_id: z.string().nullable().optional(),
  currency: z.string().default('INR'),
  tax_label: z.string().default('GST'),
  default_tax_rate: z.number().min(0).default(0),
  invoice_prefix: z.string().default('INV-'),
  invoice_next_number: z.number().int().min(1).default(1),
  invoice_number_reset: z.enum(['never', 'calendar_year', 'financial_year']).default('financial_year'),
  default_payment_terms_days: z.number().int().min(0).default(15),
  default_notes: z.string().nullable().optional(),
  default_terms: z.string().nullable().optional()
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters long')
});

// Fetch settings
app.get('/', async (c) => {
  try {
    const userId = c.get('jwtPayload').userId;
    const settings = await getSettings(c.env.DB, userId);
    return c.json(settings);
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to fetch settings' }, 500);
  }
});

// Update settings
app.put('/', async (c) => {
  try {
    const userId = c.get('jwtPayload').userId;
    const body = await c.req.json();
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
    }

    await updateSettings(c.env.DB, userId, parsed.data);
    const updated = await getSettings(c.env.DB, userId);
    return c.json({ message: 'Settings updated successfully', settings: updated });
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to update settings' }, 500);
  }
});

// Change Password
app.put('/password', async (c) => {
  try {
    const rate = checkRateLimit(c, {
      keyPrefix: 'password-change',
      limit: 5,
      windowMs: 60_000,
    });
    if (rate.limited) {
      return c.json({ error: `Too many password change attempts. Retry in ${rate.retryAfterSec}s.` }, 429);
    }

    const userId = c.get('jwtPayload').userId;
    const userPayload = c.get('jwtPayload');
    if (!userPayload) return c.json({ error: 'Unauthorized' }, 401);

    const body = await c.req.json();
    const parsed = passwordSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
    }

    const { currentPassword, newPassword } = parsed.data;

    // Fetch user from DB
    const dbUser = await getUserByUsername(c.env.DB, userPayload.username);
    if (!dbUser) return c.json({ error: 'User not found' }, 404);

    // Verify current password
    const currentHash = await hashPassword(currentPassword, dbUser.password_salt);
    if (currentHash !== dbUser.password_hash) {
      return c.json({ error: 'Incorrect current password' }, 400);
    }

    // Hash and store new password
    const newSalt = generateSalt();
    const newHash = await hashPassword(newPassword, newSalt);

    await updateUserPassword(c.env.DB, dbUser.id, newHash, newSalt);

    return c.json({ message: 'Password updated successfully' });
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to change password' }, 500);
  }
});

// Data Export (CSV downloads)
app.get('/export/:entity', async (c) => {
  try {
    const userId = c.get('jwtPayload').userId;
    const entity = c.req.param('entity');
    let data: any[] = [];
    let filename = 'backup';

    if (entity === 'clients') {
      data = await exportClients(c.env.DB, userId);
      filename = 'clients_backup.csv';
    } else if (entity === 'invoices') {
      data = await exportInvoices(c.env.DB, userId);
      filename = 'invoices_backup.csv';
    } else if (entity === 'purchase-orders') {
      data = await exportPOs(c.env.DB, userId);
      filename = 'purchase_orders_backup.csv';
    } else {
      return c.json({ error: 'Invalid entity parameter. Use clients, invoices, or purchase-orders.' }, 400);
    }

    if (data.length === 0) {
      return new Response('No data to export', {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

    // Convert JSON to CSV
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const val = row[header];
          let str = val === null || val === undefined ? '' : String(val);

          // Spreadsheet formula injection hardening:
          // If the cell starts with '=', '+', '-', '@' (optionally after whitespace), prefix with a single quote.
          if (/^\s*[=+\-@]/.test(str)) {
            str = `'${str}`;
          }
          const escaped = str.replace(/"/g, '""');
          return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n') 
            ? `"${escaped}"` 
            : escaped;
        }).join(',')
      )
    ].join('\r\n');

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (error: any) {
    return c.json({ error: error.message || 'Data export failed' }, 500);
  }
});

export default app;
