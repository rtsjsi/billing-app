import { Context, Next } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { sign, verify } from 'hono/jwt';

let localJwtSecret: string | null = null;

function isLocalRequest(c: Context): boolean {
  const host = c.req.header('host') || '';
  return host.includes('localhost') || host.startsWith('127.0.0.1');
}

export function getJwtSecret(c: Context): string {
  const secret = c.env.JWT_SECRET;
  if (secret && secret.trim() !== '') return secret;

  // For free-tier dev, generate a per-isolate random secret rather than using a known fallback.
  // In production, users should set JWT_SECRET via `wrangler secret put JWT_SECRET`.
  if (isLocalRequest(c)) {
    if (!localJwtSecret) {
      // crypto.randomUUID is widely available in modern runtimes.
      localJwtSecret = crypto.randomUUID();
    }
    return localJwtSecret;
  }

  throw new Error('JWT_SECRET is not configured. Set it via `wrangler secret put JWT_SECRET`.');
}

// Helper to hash password using Web Crypto API PBKDF2
export async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = encoder.encode(salt);
  
  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    256 // length in bits (32 bytes)
  );
  
  return Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper to generate a secure random salt
export function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Session payload type
export interface SessionPayload {
  userId: number;
  username: string;
  exp: number;
}

export function generateCsrfToken(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function isUnsafeMethod(method: string): boolean {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
}

const CSRF_EXEMPT_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/setup',
]);

/**
 * CSRF protection for cookie-based session auth.
 * - Requires a non-HttpOnly `csrf` cookie and a matching `x-csrf-token` header.
 * - Exempts initial bootstrap/login endpoints.
 */
export async function csrfMiddleware(c: Context, next: Next) {
  // Only enforce for state-changing requests
  if (!isUnsafeMethod(c.req.method)) {
    return next();
  }

  const path = c.req.path;
  if (CSRF_EXEMPT_PATHS.has(path)) {
    return next();
  }

  // If no session cookie exists, let auth middleware / handlers decide.
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) return next();

  const cookieToken = getCookie(c, 'csrf');
  const headerToken = c.req.header('x-csrf-token');
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return c.json({ error: 'Forbidden: CSRF validation failed' }, 403);
  }

  return next();
}

// Middleware to verify session from HttpOnly cookie
export async function authMiddleware(c: Context, next: Next) {
  const token = getCookie(c, 'session');
  if (!token) {
    return c.json({ error: 'Unauthorized: No session token provided' }, 401);
  }

  try {
    const secret = getJwtSecret(c);
    const payload = (await verify(token, secret, 'HS256')) as unknown as SessionPayload;
    
    // Check expiration
    if (payload.exp < Date.now() / 1000) {
      deleteCookie(c, 'session');
      return c.json({ error: 'Unauthorized: Session expired' }, 401);
    }
    
    // Store user info in context
    c.set('jwtPayload', payload);
    await next();
  } catch (err) {
    deleteCookie(c, 'session');
    return c.json({ error: 'Unauthorized: Invalid session token' }, 401);
  }
}

// Create and set the session cookie
export async function createSession(c: Context, userId: number, username: string) {
  const secret = getJwtSecret(c);
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 days expiration
  
  const token = await sign({ userId, username, exp }, secret);
  
  const csrfToken = generateCsrfToken();

  setCookie(c, 'session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 // 7 days
  });

  // CSRF cookie must be readable by frontend JS to attach to X-CSRF-Token header.
  setCookie(c, 'csrf', csrfToken, {
    httpOnly: false,
    secure: true,
    sameSite: 'Strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 // 7 days
  });
}

// Clear the session cookie
export function clearSession(c: Context) {
  deleteCookie(c, 'session', {
    path: '/'
  });

  deleteCookie(c, 'csrf', {
    path: '/'
  });
}
