import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getCookie } from 'hono/cookie';
import { 
  authMiddleware, 
  hashPassword, 
  generateSalt, 
  createSession, 
  clearSession, 
  SessionPayload,
  csrfMiddleware,
  getJwtSecret
} from './auth';
import { checkRateLimit } from './lib/rate-limit';
import { 
  getUserCount, 
  getUserByUsername, 
  createUser,
  updateSettings,
  getSettings
} from './db/queries';
import { SCHEMA_SQL } from './db/schema-sql';

// Import sub-routers
import dashboardRouter from './routes/dashboard';
import clientsRouter from './routes/clients';
import poRouter from './routes/purchase-orders';
import invoicesRouter from './routes/invoices';
import paymentsRouter from './routes/payments';
import settingsRouter from './routes/settings';

type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Free-tier hardening: restrict CORS to known dev origins.
// Same-origin requests (app served from this Worker) don't need CORS.
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8787',
  'http://127.0.0.1:8787',
]);

app.use(
  '*',
  cors({
    origin: (origin) => {
      // If Origin header is absent, it's typically a same-origin request; no CORS response is needed.
      if (!origin) return undefined;
      return allowedOrigins.has(origin) ? origin : undefined;
    },
    credentials: true,
  })
);

// CSRF protection for cookie-based session auth.
app.use('/api/*', csrfMiddleware);

// ----------------------------------------------------
// Public Authentication & Setup API
// ----------------------------------------------------

// Check if setup is needed (we allow multiple signups, so this is just to auto-initialize the schema if needed)
app.get('/api/auth/setup-status', async (c) => {
  try {
    const userCount = await getUserCount(c.env.DB);
    // If there are no users yet, the setup flow should be required.
    return c.json({ needsSetup: userCount === 0 });
  } catch (error: any) {
    const errMsg = error.message || '';
    if (errMsg.includes('no such table') || errMsg.includes('no such table: users')) {
      try {
        // Automatically initialize SQLite database tables
        await c.env.DB.exec(SCHEMA_SQL);
        return c.json({ needsSetup: true });
      } catch (execError: any) {
        return c.json({ error: `Auto-initialization of D1 failed: ${execError.message}` }, 500);
      }
    }
    return c.json({ error: errMsg || 'Database connection error' }, 500);
  }
});

// Setup admin user & business profile (now acts as standard registration)
app.post('/api/auth/setup', async (c) => {
  try {
    const rate = checkRateLimit(c, {
      keyPrefix: 'auth-setup',
      limit: 5,
      windowMs: 60_000,
    });
    if (rate.limited) {
      return c.json({ error: `Too many setup attempts. Retry in ${rate.retryAfterSec}s.` }, 429);
    }

    const userCount = await getUserCount(c.env.DB);
    if (userCount > 0) {
      return c.json({ error: 'Setup already completed' }, 409);
    }

    const { username, password, business_name, owner_name, email } = await c.req.json();
    if (!username || !password || !business_name) {
      return c.json({ error: 'Username, password, and business name are required' }, 400);
    }

    // Create user
    const salt = generateSalt();
    const hash = await hashPassword(password, salt);
    
    // Check if username already exists
    const existing = await getUserByUsername(c.env.DB, username);
    if (existing) {
      return c.json({ error: 'Username is already taken' }, 400);
    }

    const userId = await createUser(c.env.DB, username, hash, salt);

    // Create business profile for the new user
    await c.env.DB.prepare(`
      INSERT INTO business_settings (user_id, business_name, owner_name, email, updated_at) 
      VALUES (?, ?, ?, ?, ?)
    `).bind(userId, business_name, owner_name || '', email || '', new Date().toISOString()).run();

    // Automatically log in
    await createSession(c, userId, username);

    return c.json({ message: 'Setup completed successfully and logged in' }, 201);
  } catch (error: any) {
    return c.json({ error: error.message || 'Setup failed' }, 500);
  }
});

// User Login
app.post('/api/auth/login', async (c) => {
  try {
    const rate = checkRateLimit(c, {
      keyPrefix: 'auth-login',
      limit: 10,
      windowMs: 60_000,
    });
    if (rate.limited) {
      return c.json({ error: `Too many login attempts. Retry in ${rate.retryAfterSec}s.` }, 429);
    }

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
    const token = getCookie(c, 'session');
    if (!token) return c.json({ authenticated: false }, 200);

    const secret = getJwtSecret(c);
    const { verify } = await import('hono/jwt');
    const payload = (await verify(token, secret, 'HS256')) as unknown as SessionPayload;

    if (payload.exp < Date.now() / 1000) {
      return c.json({ authenticated: false }, 200);
    }

    const settings = await getSettings(c.env.DB, payload.userId);

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

app.route('/api', api);

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
