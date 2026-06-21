import { Context, Next } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { sign, verify } from 'hono/jwt';

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

// Middleware to verify session from HttpOnly cookie
export async function authMiddleware(c: Context, next: Next) {
  const token = getCookie(c, 'session');
  if (!token) {
    return c.json({ error: 'Unauthorized: No session token provided' }, 401);
  }

  try {
    const secret = c.env.JWT_SECRET || 'local-dev-jwt-secret-key-change-in-production';
    const payload = (await verify(token, secret, 'HS256')) as unknown as SessionPayload;
    
    // Check expiration
    if (payload.exp < Date.now() / 1000) {
      deleteCookie(c, 'session');
      return c.json({ error: 'Unauthorized: Session expired' }, 401);
    }
    
    // Store user info in context
    c.set('user', payload);
    await next();
  } catch (err) {
    deleteCookie(c, 'session');
    return c.json({ error: 'Unauthorized: Invalid session token' }, 401);
  }
}

// Create and set the session cookie
export async function createSession(c: Context, userId: number, username: string) {
  const secret = c.env.JWT_SECRET || 'local-dev-jwt-secret-key-change-in-production';
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 days expiration
  
  const token = await sign({ userId, username, exp }, secret);
  
  setCookie(c, 'session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 // 7 days
  });
}

// Clear the session cookie
export function clearSession(c: Context) {
  deleteCookie(c, 'session', {
    path: '/'
  });
}
