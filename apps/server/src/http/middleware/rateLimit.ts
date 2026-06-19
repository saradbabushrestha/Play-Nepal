import rateLimit from 'express-rate-limit';

// Generous global limiter — protects against bursts / scraping.
export const globalLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { ok: false, code: 'RATE_LIMITED', message: 'Too many requests, slow down.' },
});

// Strict limiter for auth endpoints — blunts credential-stuffing / brute force.
export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { ok: false, code: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' },
});
