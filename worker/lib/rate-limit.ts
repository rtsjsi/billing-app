type RateLimitOptions = {
  /** Max requests allowed within the sliding window. */
  limit: number;
  /** Window size in milliseconds. */
  windowMs: number;
  /** Optional prefix to avoid collisions between routes. */
  keyPrefix?: string;
};

type Entry = {
  windowStartMs: number;
  count: number;
};

// In-memory rate limiter (best-effort) for free tier.
// Note: limits are per Worker instance, not global across all instances.
const store = new Map<string, Entry>();
const MAX_KEYS = 2000;

function pruneIfNeeded() {
  if (store.size <= MAX_KEYS) return;
  // Simple prune: clear all to bound memory. This is sufficient for free-tier hardening.
  store.clear();
}

function getClientIp(c: any): string {
  // Cloudflare header (preferred)
  const cfIp = c.req?.header?.('cf-connecting-ip') ?? c.req?.raw?.headers?.get?.('cf-connecting-ip');
  if (cfIp) return String(cfIp);

  // Fallback: first IP in XFF
  const xff =
    c.req?.header?.('x-forwarded-for') ?? c.req?.raw?.headers?.get?.('x-forwarded-for');
  if (xff) return String(xff).split(',')[0]?.trim() || 'unknown';

  return 'unknown';
}

export function checkRateLimit(c: any, opts: RateLimitOptions): { limited: boolean; retryAfterSec: number } {
  pruneIfNeeded();

  const ip = getClientIp(c);
  const keyPrefix = opts.keyPrefix ? `${opts.keyPrefix}:` : '';
  const key = `${keyPrefix}${ip}`;

  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now - entry.windowStartMs >= opts.windowMs) {
    store.set(key, { windowStartMs: now, count: 1 });
    return { limited: false, retryAfterSec: 0 };
  }

  if (entry.count >= opts.limit) {
    const retryAfterSec = Math.ceil((opts.windowMs - (now - entry.windowStartMs)) / 1000);
    return { limited: true, retryAfterSec };
  }

  entry.count += 1;
  store.set(key, entry);
  return { limited: false, retryAfterSec: 0 };
}

