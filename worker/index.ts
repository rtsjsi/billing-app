import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { 
  authMiddleware, 
  hashPassword, 
  generateSalt, 
  createSession, 
  clearSession, 
  SessionPayload 
} from './auth';
import { 
  getUserCount, 
  getUserByUsername, 
  createUser,
  updateSettings,
  getSettings
} from './db/queries';

// Import sub-routers
import dashboardRouter from './routes/dashboard';
import clientsRouter from './routes/clients';
import poRouter from './routes/purchase-orders';
import invoicesRouter from './routes/invoices';
import paymentsRouter from './routes/payments';
import settingsRouter from './routes/settings';

type Bindings = {
  DB: D1Database;
  ATTACHMENTS: R2Bucket;
  ASSETS: Fetcher;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Enable CORS in dev if needed
app.use('*', cors({
  origin: (origin) => origin, // allow all origins dynamically for easy dev
  credentials: true,
}));

// ----------------------------------------------------
// Public Authentication & Setup API
// ----------------------------------------------------

// Check if setup is needed
app.get('/api/auth/setup-status', async (c) => {
  try {
    const userCount = await getUserCount(c.env.DB);
    return c.json({ needsSetup: userCount === 0 });
  } catch (error: any) {
    return c.json({ error: error.message || 'Database connection error' }, 500);
  }
});

// Setup admin user & business profile
app.post('/api/auth/setup', async (c) => {
  try {
    const userCount = await getUserCount(c.env.DB);
    if (userCount > 0) {
      return c.json({ error: 'Setup has already been completed.' }, 400);
    }

    const { username, password, business_name, owner_name, email } = await c.req.json();
    if (!username || !password || !business_name) {
      return c.json({ error: 'Username, password, and business name are required' }, 400);
    }

    // Create user
    const salt = generateSalt();
    const hash = await hashPassword(password, salt);
    await createUser(c.env.DB, username, hash, salt);

    // Get the seeded settings and update it with user profile
    await updateSettings(c.env.DB, {
      business_name,
      owner_name: owner_name || '',
      email: email || ''
    });

    // Automatically log in
    const user = await getUserByUsername(c.env.DB, username);
    if (!user) throw new Error('Failed to retrieve setup user');

    await createSession(c, user.id, user.username);

    return c.json({ message: 'Setup completed successfully and logged in' }, 201);
  } catch (error: any) {
    return c.json({ error: error.message || 'Setup failed' }, 500);
  }
});

// User Login
app.post('/api/auth/login', async (c) => {
  try {
    const { username, password } = await c.req.json();
    if (!username || !password) {
      return c.json({ error: 'Username and password are required' }, 400);
    }

    const user = await getUserByUsername(c.env.DB, username);
    if (!user) {
      return c.json({ error: 'Invalid username or password' }, 401);
    }

    const hash = await hashPassword(password, user.password_salt);
    if (hash !== user.password_hash) {
      return c.json({ error: 'Invalid username or password' }, 401);
    }

    // Set HttpOnly cookie session
    await createSession(c, user.id, user.username);

    return c.json({ message: 'Logged in successfully', username: user.username });
  } catch (error: any) {
    return c.json({ error: error.message || 'Login failed' }, 500);
  }
});

// User Logout
app.post('/api/auth/logout', (c) => {
  clearSession(c);
  return c.json({ message: 'Logged out successfully' });
});

// Get Current User (who am i?)
app.get('/api/auth/me', async (c) => {
  try {
    // If no token exists, return unauthenticated status
    const req = c.req.raw;
    const cookie = req.headers.get('Cookie');
    if (!cookie || !cookie.includes('session=')) {
      return c.json({ authenticated: false }, 200);
    }

    // Run auth middleware manually or return session info
    const token = cookie.split(';').find(item => item.trim().startsWith('session='))?.split('=')[1];
    if (!token) return c.json({ authenticated: false }, 200);

    const secret = c.env.JWT_SECRET || 'local-dev-jwt-secret-key-change-in-production';
    const { verify } = await import('hono/jwt');
    const payload = (await verify(token, secret, 'HS256')) as unknown as SessionPayload;

    if (payload.exp < Date.now() / 1000) {
      return c.json({ authenticated: false }, 200);
    }

    const settings = await getSettings(c.env.DB);

    return c.json({
      authenticated: true,
      username: payload.username,
      businessName: settings.business_name,
      currency: settings.currency
    });
  } catch {
    return c.json({ authenticated: false }, 200);
  }
});

// ----------------------------------------------------
// Protected API Routes
// ----------------------------------------------------

const api = new Hono<{ Bindings: Bindings }>();
api.use('*', authMiddleware);

api.route('/dashboard', dashboardRouter);
api.route('/clients', clientsRouter);
api.route('/purchase-orders', poRouter);
api.route('/invoices', invoicesRouter);
api.route('/payments', paymentsRouter);
api.route('/settings', settingsRouter);

app.route('/', api);

// ----------------------------------------------------
// Static Assets & SPA Fallback Route
// ----------------------------------------------------

app.get('*', async (c) => {
  const url = new URL(c.req.url);

  // If path starts with /api/, it's an unmapped API route -> 404
  if (url.pathname.startsWith('/api/')) {
    return c.json({ error: 'API Endpoint not found' }, 404);
  }

  // SPA Route Fallback:
  // If the path does not have an extension (e.g., /invoices/edit/1 vs /assets/main.js),
  // redirect request path to serve /index.html from static assets so React Router handles it.
  const hasExtension = url.pathname.includes('.');
  if (!hasExtension) {
    url.pathname = '/index.html';
  }

  try {
    if (!c.env.ASSETS) {
      return c.text('ASSETS binding is missing. Ensure you are running under Wrangler or deployed on Cloudflare.', 500);
    }
    
    const assetResponse = await c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw));
    
    // If the file was not found even in assets, fallback to index.html to allow SPA routing
    if (assetResponse.status === 404 && hasExtension) {
      url.pathname = '/index.html';
      return await c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw));
    }

    return assetResponse;
  } catch (error: any) {
    return c.text(`Asset fetch failed: ${error.message}`, 500);
  }
});

export default app;
